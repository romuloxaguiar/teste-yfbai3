"""
Natural Language Processing utilities for the AI engine providing advanced text analysis capabilities.
Implements core NLP functions for topic detection, action item recognition, and text preprocessing.

Dependencies:
numpy==1.23.0
torch==2.0.0
transformers==4.30.2
spacy==3.5.3
nltk==3.8.0
"""

import numpy as np
import torch
from transformers import pipeline, AutoTokenizer, AutoModel
import spacy
import nltk
from nltk.tokenize import sent_tokenize
import logging
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
import time
from functools import wraps
import json
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class ProcessingMetrics:
    """Stores metrics for NLP processing operations."""
    processing_time: float
    input_length: int
    output_length: int
    confidence_score: float
    gpu_memory_used: Optional[float] = None

def performance_monitor(func):
    """Decorator for monitoring function performance and resource usage."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        gpu_memory_start = torch.cuda.memory_allocated() if torch.cuda.is_available() else 0
        
        try:
            result = func(*args, **kwargs)
            
            metrics = ProcessingMetrics(
                processing_time=time.time() - start_time,
                input_length=len(args[0]) if args else 0,
                output_length=len(result) if result else 0,
                confidence_score=getattr(result, 'confidence', 1.0),
                gpu_memory_used=torch.cuda.memory_allocated() - gpu_memory_start if torch.cuda.is_available() else None
            )
            
            logger.info(f"Function {func.__name__} metrics: {metrics}")
            return result
            
        except Exception as e:
            logger.error(f"Error in {func.__name__}: {str(e)}")
            raise
            
    return wrapper

class NLPPipeline:
    """Configurable NLP pipeline for text analysis operations with performance optimization."""
    
    def __init__(self, model_name: str, config: Dict, performance_config: Optional[Dict] = None):
        """Initialize NLP pipeline with specified models and configuration."""
        self._config = config
        self._cache = {}
        self._metrics = {}
        
        # Initialize GPU if available
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        logger.info(f"Using device: {self.device}")
        
        try:
            # Initialize transformer pipeline
            self._transformer_pipeline = pipeline(
                task="text-classification",
                model=model_name,
                device=0 if torch.cuda.is_available() else -1
            )
            
            # Initialize spaCy pipeline
            self._spacy_nlp = spacy.load("en_core_web_lg")
            
            # Configure batch processing
            self._batch_size = performance_config.get('batch_size', 32)
            
            # Download required NLTK data
            nltk.download('punkt', quiet=True)
            
            logger.info("NLP Pipeline initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize NLP Pipeline: {str(e)}")
            raise
    
    @performance_monitor
    def process(self, text: str, process_config: Optional[Dict] = None) -> Dict:
        """Process text through configured NLP pipeline with performance optimization."""
        if not text or not isinstance(text, str):
            raise ValueError("Invalid input text")
            
        cache_key = hash(text)
        if cache_key in self._cache:
            logger.info("Returning cached result")
            return self._cache[cache_key]
            
        try:
            # Preprocess text
            cleaned_text = preprocess_text(text, self._config.get('preprocessing_options', {}))
            
            # Process with transformer
            transformer_output = self._transformer_pipeline(
                cleaned_text,
                batch_size=self._batch_size,
                truncation=True
            )
            
            # Process with spaCy
            doc = self._spacy_nlp(cleaned_text)
            
            results = {
                'transformer_output': transformer_output,
                'entities': [(ent.text, ent.label_) for ent in doc.ents],
                'confidence': np.mean([output['score'] for output in transformer_output])
            }
            
            # Cache results
            self._cache[cache_key] = results
            return results
            
        except Exception as e:
            logger.error(f"Error in pipeline processing: {str(e)}")
            raise

    def update_config(self, new_config: Dict, validate_only: bool = False) -> bool:
        """Update pipeline configuration dynamically with validation."""
        try:
            # Validate new configuration
            if not all(key in new_config for key in ['model_params', 'preprocessing_options']):
                raise ValueError("Invalid configuration format")
                
            if validate_only:
                return True
                
            # Backup current config
            old_config = self._config.copy()
            
            # Update configuration
            self._config.update(new_config)
            self._cache.clear()  # Invalidate cache
            
            logger.info("Configuration updated successfully")
            return True
            
        except Exception as e:
            logger.error(f"Configuration update failed: {str(e)}")
            self._config = old_config
            return False

@performance_monitor
def preprocess_text(text: str, options: Dict[str, bool], cache_config: Optional[Dict] = None) -> str:
    """Preprocess text for NLP analysis with enhanced error handling and validation."""
    if not text or not isinstance(text, str):
        raise ValueError("Invalid input text")
        
    try:
        # Normalize whitespace and encoding
        processed_text = ' '.join(text.split())
        processed_text = processed_text.encode('ascii', 'ignore').decode()
        
        # Apply optional preprocessing steps
        if options.get('remove_special_chars', True):
            processed_text = ''.join(char for char in processed_text if char.isalnum() or char.isspace())
            
        if options.get('lowercase', True):
            processed_text = processed_text.lower()
            
        if options.get('remove_extra_whitespace', True):
            processed_text = ' '.join(processed_text.split())
            
        return processed_text
        
    except Exception as e:
        logger.error(f"Text preprocessing failed: {str(e)}")
        raise

@torch.no_grad()
@performance_monitor
def detect_action_items(text: str, confidence_threshold: float = 0.8, model_config: Optional[Dict] = None) -> List[Dict]:
    """Detect potential action items in text using transformer models with confidence scoring."""
    if not text or confidence_threshold < 0 or confidence_threshold > 1:
        raise ValueError("Invalid input parameters")
        
    try:
        # Initialize model
        model_name = model_config.get('model_name', 'bert-base-uncased')
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModel.from_pretrained(model_name)
        
        if torch.cuda.is_available():
            model = model.cuda()
            
        # Process text in batches
        sentences = sent_tokenize(text)
        action_items = []
        
        for sentence in sentences:
            inputs = tokenizer(sentence, return_tensors="pt", truncation=True, max_length=512)
            if torch.cuda.is_available():
                inputs = {k: v.cuda() for k, v in inputs.items()}
                
            outputs = model(**inputs)
            confidence = torch.sigmoid(outputs.logits.mean()).item()
            
            if confidence >= confidence_threshold and any(keyword in sentence.lower() 
                for keyword in ['action', 'task', 'todo', 'assign', 'deadline']):
                action_items.append({
                    'text': sentence,
                    'confidence': confidence,
                    'assignee': extract_assignee(sentence),
                    'deadline': extract_deadline(sentence)
                })
                
        return action_items
        
    except Exception as e:
        logger.error(f"Action item detection failed: {str(e)}")
        raise
    finally:
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

@torch.no_grad()
@performance_monitor
def extract_topics(text: str, min_relevance_score: float = 0.3, clustering_config: Optional[Dict] = None) -> List[Dict]:
    """Extract main topics and subtopics from text using NLP with hierarchical clustering."""
    if not text or min_relevance_score < 0 or min_relevance_score > 1:
        raise ValueError("Invalid input parameters")
        
    try:
        # Initialize model
        model_name = clustering_config.get('model_name', 'bert-base-uncased')
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModel.from_pretrained(model_name)
        
        if torch.cuda.is_available():
            model = model.cuda()
            
        # Generate embeddings
        inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
        if torch.cuda.is_available():
            inputs = {k: v.cuda() for k, v in inputs.items()}
            
        outputs = model(**inputs)
        embeddings = outputs.last_hidden_state.mean(dim=1)
        
        # Perform hierarchical clustering
        topics = hierarchical_topic_clustering(embeddings, min_relevance_score)
        
        return [{
            'topic': topic['name'],
            'relevance': topic['score'],
            'subtopics': topic.get('subtopics', []),
            'keywords': extract_keywords(topic['text'])
        } for topic in topics if topic['score'] >= min_relevance_score]
        
    except Exception as e:
        logger.error(f"Topic extraction failed: {str(e)}")
        raise
    finally:
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

def extract_assignee(text: str) -> Optional[str]:
    """Helper function to extract assignee from action item text."""
    # Implementation details omitted for brevity
    pass

def extract_deadline(text: str) -> Optional[str]:
    """Helper function to extract deadline from action item text."""
    # Implementation details omitted for brevity
    pass

def hierarchical_topic_clustering(embeddings: torch.Tensor, threshold: float) -> List[Dict]:
    """Helper function to perform hierarchical topic clustering."""
    # Implementation details omitted for brevity
    pass

def extract_keywords(text: str) -> List[str]:
    """Helper function to extract keywords from topic text."""
    # Implementation details omitted for brevity
    pass