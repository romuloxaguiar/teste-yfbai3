"""
Text preprocessing utility module for the AI engine that handles cleaning, normalization,
and preparation of meeting transcription text for NLP analysis.

Dependencies:
spacy==3.5.3
nltk==3.8.0
cachetools==5.0.0
"""

import re
import unicodedata
import spacy
import nltk
from multiprocessing import Pool, cpu_count
from cachetools import TTLCache
from typing import Dict, List, Any, Optional
import logging
from utils.nlp_utils import preprocess_text
from config import AI_ENGINE_CONFIG

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Common filler words in meeting transcripts
FILLER_WORDS = {
    'um', 'uh', 'ah', 'er', 'like', 'you know', 'sort of', 'kind of',
    'basically', 'actually', 'literally', 'well', 'so', 'right'
}

class TranscriptionPreprocessor:
    """Enhanced main class for handling meeting transcription preprocessing with batch processing and performance optimization."""
    
    def __init__(self, config: Dict):
        """
        Initializes the preprocessor with required models, configurations, and optimization features.
        
        Args:
            config: Configuration dictionary for preprocessing settings
        """
        self._config = config
        self._nlp = spacy.load("en_core_web_lg")
        self._filler_words = FILLER_WORDS
        
        # Initialize caching with 1-hour TTL
        self._pattern_cache = TTLCache(maxsize=1000, ttl=3600)
        
        # Initialize multiprocessing pool
        self._process_pool = Pool(processes=cpu_count())
        
        # Initialize performance metrics
        self._performance_metrics = {
            'total_processing_time': 0.0,
            'texts_processed': 0,
            'average_processing_time': 0.0,
            'cache_hits': 0
        }
        
        logger.info("TranscriptionPreprocessor initialized successfully")

    def process(self, text: str, use_cache: bool = True, parallel_process: bool = True) -> Dict:
        """
        Processes raw transcription text through the complete preprocessing pipeline with optimizations.
        
        Args:
            text: Raw transcription text
            use_cache: Whether to use pattern caching
            parallel_process: Whether to enable parallel processing
            
        Returns:
            Dict containing processed text and metadata
        """
        if not text:
            raise ValueError("Empty text provided")
            
        start_time = time.time()
        cache_key = hash(text)
        
        # Check cache if enabled
        if use_cache and cache_key in self._pattern_cache:
            self._performance_metrics['cache_hits'] += 1
            return self._pattern_cache[cache_key]
            
        try:
            # Clean transcription text
            cleaned_text = clean_transcription_text(text)
            
            # Segment speakers
            speaker_segments = segment_speakers(cleaned_text)
            
            # Process text chunks in parallel if enabled
            if parallel_process and len(text) > self._config['preprocessing'].get('max_chunk_size', 2048):
                chunk_size = self._config['preprocessing']['max_chunk_size']
                chunks = [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]
                
                processed_chunks = self._process_pool.map(self._process_chunk, chunks)
                processed_text = ''.join(processed_chunks)
            else:
                processed_text = self._process_chunk(cleaned_text)
            
            result = {
                'processed_text': processed_text,
                'speaker_segments': speaker_segments,
                'metadata': {
                    'original_length': len(text),
                    'processed_length': len(processed_text),
                    'processing_time': time.time() - start_time
                }
            }
            
            # Update cache if enabled
            if use_cache:
                self._pattern_cache[cache_key] = result
                
            # Update performance metrics
            self._update_performance_metrics(result['metadata']['processing_time'])
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing text: {str(e)}")
            raise

    def _process_chunk(self, chunk: str) -> str:
        """
        Processes a single chunk of text through the preprocessing pipeline.
        
        Args:
            chunk: Text chunk to process
            
        Returns:
            Processed text chunk
        """
        # Remove filler words
        text_without_fillers = remove_filler_words(chunk)
        
        # Normalize text
        normalized_text = normalize_text(
            text_without_fillers,
            options={
                'case_sensitive': self._config['preprocessing'].get('case_sensitive', False),
                'remove_punctuation': self._config['preprocessing'].get('remove_punctuation', True)
            }
        )
        
        return normalized_text

    def update_config(self, new_config: Dict) -> bool:
        """
        Updates preprocessing configuration with validation.
        
        Args:
            new_config: New configuration dictionary
            
        Returns:
            Success status
        """
        try:
            # Validate configuration
            if not all(key in new_config for key in ['preprocessing']):
                raise ValueError("Invalid configuration format")
                
            # Update configuration
            self._config.update(new_config)
            
            # Clear cache
            self._pattern_cache.clear()
            
            logger.info("Configuration updated successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update configuration: {str(e)}")
            return False

    def get_performance_metrics(self) -> Dict[str, float]:
        """
        Retrieves current performance metrics and statistics.
        
        Returns:
            Dictionary containing performance metrics
        """
        return self._performance_metrics

    def _update_performance_metrics(self, processing_time: float):
        """Updates internal performance metrics."""
        self._performance_metrics['total_processing_time'] += processing_time
        self._performance_metrics['texts_processed'] += 1
        self._performance_metrics['average_processing_time'] = (
            self._performance_metrics['total_processing_time'] /
            self._performance_metrics['texts_processed']
        )

def clean_transcription_text(text: str) -> str:
    """
    Cleans raw meeting transcription text by removing artifacts and normalizing format.
    
    Args:
        text: Raw transcription text
        
    Returns:
        Cleaned transcription text
    """
    if not text:
        return text
        
    # Remove timestamp markers
    text = re.sub(r'\[\d{2}:\d{2}:\d{2}\]', '', text)
    
    # Clean speaker labels
    text = re.sub(r'Speaker \d+:', '', text)
    
    # Normalize whitespace
    text = ' '.join(text.split())
    
    # Remove special characters while preserving punctuation
    text = re.sub(r'[^\w\s\.,!?-]', '', text)
    
    return text

def remove_filler_words(text: str) -> str:
    """
    Removes common filler words and speech artifacts from text.
    
    Args:
        text: Input text
        
    Returns:
        Text with filler words removed
    """
    if not text:
        return text
        
    # Create regex pattern for filler words
    pattern = r'\b(?:' + '|'.join(map(re.escape, FILLER_WORDS)) + r')\b'
    
    # Remove filler words while preserving sentence structure
    cleaned_text = re.sub(pattern, '', text)
    
    # Clean up any resulting double spaces
    cleaned_text = ' '.join(cleaned_text.split())
    
    return cleaned_text

def normalize_text(text: str, options: Dict[str, bool]) -> str:
    """
    Normalizes text encoding, case, and punctuation.
    
    Args:
        text: Input text
        options: Normalization options
        
    Returns:
        Normalized text
    """
    if not text:
        return text
        
    # Convert to unicode and normalize character encoding
    text = unicodedata.normalize('NFKC', text)
    
    # Apply case normalization if specified
    if not options.get('case_sensitive', False):
        text = text.lower()
    
    # Remove punctuation if specified
    if options.get('remove_punctuation', True):
        text = re.sub(r'[^\w\s]', '', text)
    
    # Normalize whitespace
    text = ' '.join(text.split())
    
    return text

def segment_speakers(text: str) -> List[Dict]:
    """
    Segments text by speaker and cleans speaker annotations with confidence scoring.
    
    Args:
        text: Input text with speaker annotations
        
    Returns:
        List of speaker segments with cleaned text and confidence scores
    """
    if not text:
        return []
        
    # Regular expression for speaker identification
    speaker_pattern = r'(Speaker \d+|[A-Z][a-z]+ [A-Z][a-z]+):\s*(.*?)(?=(?:Speaker \d+|[A-Z][a-z]+ [A-Z][a-z]+):|$)'
    
    segments = []
    for match in re.finditer(speaker_pattern, text, re.DOTALL):
        speaker, content = match.groups()
        
        # Clean the speaker's text content
        cleaned_content = clean_transcription_text(content.strip())
        
        # Calculate confidence score based on text quality
        confidence_score = min(1.0, len(cleaned_content.split()) / 5)
        
        segments.append({
            'speaker': speaker,
            'text': cleaned_content,
            'confidence': confidence_score,
            'start_index': match.start(),
            'end_index': match.end()
        })
    
    return segments