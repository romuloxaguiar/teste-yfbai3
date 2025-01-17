"""
Main entry point for the AI engine service that orchestrates topic detection,
action item recognition, and summary generation for meeting transcriptions.

Version: 1.0.0
Dependencies:
fastapi==0.95.0
pydantic==1.10.0
uvicorn==0.21.0
torch==2.0.0
prometheus_client==0.16.0
opentelemetry==1.15.0
"""

import logging
from typing import Dict, List, Optional
import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import torch
from prometheus_client import Counter, Histogram, start_http_server
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode

from config import AI_ENGINE_CONFIG, load_config
from models.topic_detection import TopicDetector
from models.action_item_recognition import ActionItemRecognizer
from models.summary_generation import SummaryGenerator
from utils.nlp_utils import preprocess_text

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize metrics
PROCESSING_TIME = Histogram(
    'meeting_processing_seconds',
    'Time spent processing meeting transcriptions',
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0]
)
PROCESSING_ERRORS = Counter(
    'meeting_processing_errors_total',
    'Total number of processing errors'
)

class TranscriptionRequest(BaseModel):
    """Request model for transcription processing."""
    text: str = Field(..., min_length=1)
    meeting_id: str = Field(..., min_length=1)
    processing_options: Optional[Dict] = Field(default=None)

class AIEngine:
    """Main class orchestrating the AI processing pipeline."""
    
    def __init__(self, config: Dict):
        """Initialize AI engine components with monitoring."""
        self._config = config
        self._device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        try:
            # Initialize AI models
            self._topic_detector = TopicDetector(config)
            self._action_recognizer = ActionItemRecognizer(config)
            self._summary_generator = SummaryGenerator(config)
            
            logger.info(f"AI Engine initialized successfully on device: {self._device}")
            
        except Exception as e:
            logger.error(f"Failed to initialize AI Engine: {str(e)}")
            raise

    @PROCESSING_TIME.time()
    async def process_transcription(
        self,
        transcription: TranscriptionRequest,
        background_tasks: BackgroundTasks
    ) -> Dict:
        """Process meeting transcription through the AI pipeline."""
        tracer = trace.get_tracer(__name__)
        
        with tracer.start_as_current_span("process_transcription") as span:
            try:
                # Preprocess transcription
                processed_text = preprocess_text(
                    transcription.text,
                    self._config.get('preprocessing', {})
                )
                
                # Detect topics
                topics = self._topic_detector.detect_topics(
                    processed_text,
                    confidence_threshold=self._config['topic_detection']['confidence_threshold']
                )
                
                # Detect action items
                action_items = self._action_recognizer.detect_action_items(
                    processed_text,
                    processing_config=transcription.processing_options
                )
                
                # Generate summary
                summary = self._summary_generator.generate_summary(
                    processed_text,
                    quality_config={'min_quality': 0.85}
                )
                
                # Validate output quality
                if not self._validate_output_quality(topics, action_items, summary):
                    span.set_status(Status(StatusCode.ERROR, "Output quality below threshold"))
                    raise HTTPException(status_code=422, detail="Generated content below quality threshold")
                
                # Schedule background model updates if needed
                background_tasks.add_task(self._update_models_if_needed)
                
                return {
                    'meeting_id': transcription.meeting_id,
                    'topics': topics,
                    'action_items': action_items,
                    'summary': summary,
                    'metadata': {
                        'processing_time': PROCESSING_TIME.observe(),
                        'device': str(self._device),
                        'model_versions': self._get_model_versions()
                    }
                }
                
            except Exception as e:
                PROCESSING_ERRORS.inc()
                span.set_status(Status(StatusCode.ERROR, str(e)))
                logger.error(f"Error processing transcription: {str(e)}")
                raise HTTPException(status_code=500, detail=str(e))

    def _validate_output_quality(self, topics: Dict, action_items: List[Dict], summary: Dict) -> bool:
        """Validate the quality of generated outputs."""
        try:
            # Check topic detection quality
            topic_quality = topics.get('metadata', {}).get('performance_score', 0)
            if topic_quality < self._config['topic_detection']['performance_target']:
                return False
            
            # Check action item quality
            action_quality = all(item.get('confidence', 0) >= 
                               self._config['action_item_recognition']['confidence_threshold']
                               for item in action_items)
            if not action_quality:
                return False
            
            # Check summary quality
            summary_quality = summary.get('metadata', {}).get('quality_score', 0)
            if summary_quality < self._config['summary_generation']['performance_target']:
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating output quality: {str(e)}")
            return False

    async def _update_models_if_needed(self):
        """Background task to update models if performance degrades."""
        try:
            # Check and update models if needed
            for model in [self._topic_detector, self._action_recognizer, self._summary_generator]:
                if hasattr(model, 'update_model'):
                    await model.update_model(self._config, validate_performance=True)
        except Exception as e:
            logger.error(f"Error updating models: {str(e)}")

    def _get_model_versions(self) -> Dict:
        """Get current versions of all models."""
        return {
            'topic_detector': self._config['topic_detection']['model_name'],
            'action_recognizer': self._config['action_item_recognition']['model_name'],
            'summary_generator': self._config['summary_generation']['model_name']
        }

def create_app(config: Optional[Dict] = None) -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="Meeting Minutes AI Engine",
        description="AI-powered meeting transcription processing service",
        version="1.0.0"
    )
    
    # Load configuration
    app_config = config or load_config()
    
    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Initialize AI Engine
    ai_engine = AIEngine(app_config)
    
    @app.post("/api/v1/process")
    async def process_transcription(
        request: TranscriptionRequest,
        background_tasks: BackgroundTasks
    ) -> JSONResponse:
        """Process meeting transcription endpoint."""
        result = await ai_engine.process_transcription(request, background_tasks)
        return JSONResponse(content=result)
    
    @app.get("/health")
    async def health_check() -> Dict:
        """Health check endpoint."""
        return {
            "status": "healthy",
            "gpu_available": torch.cuda.is_available(),
            "models_loaded": all([
                hasattr(ai_engine, '_topic_detector'),
                hasattr(ai_engine, '_action_recognizer'),
                hasattr(ai_engine, '_summary_generator')
            ])
        }
    
    return app

def main():
    """Application entry point."""
    # Start metrics server
    start_http_server(8000)
    
    # Load configuration
    config = load_config()
    
    # Create and run application
    app = create_app(config)
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8080,
        workers=4,
        log_level="info"
    )

if __name__ == "__main__":
    main()