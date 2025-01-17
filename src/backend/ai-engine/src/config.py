"""
Central configuration file for the AI engine that defines model parameters, processing settings,
and performance thresholds for all AI components including topic detection, action item recognition,
and summary generation.

Version: 1.0.0
"""

import os
from typing import Dict, Any
import torch

# Default AI Engine Configuration
AI_ENGINE_CONFIG: Dict[str, Any] = {
    "topic_detection": {
        "model_name": "bert-base-uncased",  # Pre-trained BERT model for topic detection
        "confidence_threshold": 0.85,  # Minimum confidence score for topic detection
        "max_topics": 10,  # Maximum number of topics to extract per meeting
        "chunk_size": 512,  # Text chunk size for processing
        "device": "cuda" if torch.cuda.is_available() else "cpu",  # Automatically select GPU if available
        "batch_size": 16,  # Batch size for inference
        "performance_target": 0.95  # Target accuracy as per specifications (95%)
    },
    "action_item_recognition": {
        "model_name": "roberta-base",  # RoBERTa model for action item detection
        "confidence_threshold": 0.8,  # Minimum confidence for action item identification
        "max_items": 20,  # Maximum number of action items per meeting
        "device": "cuda" if torch.cuda.is_available() else "cpu",
        "batch_size": 32,
        "performance_target": 0.90  # Target accuracy as per specifications (90%)
    },
    "summary_generation": {
        "model_name": "facebook/bart-large-cnn",  # BART model for summary generation
        "max_length": 1024,  # Maximum summary length
        "min_length": 256,  # Minimum summary length
        "device": "cuda" if torch.cuda.is_available() else "cpu",
        "batch_size": 8,
        "performance_target": 0.85,  # Target quality score as per specifications (85%)
        "num_beams": 4  # Beam search parameter for better summary quality
    },
    "preprocessing": {
        "remove_filler_words": True,  # Remove um, uh, like, etc.
        "normalize_text": True,  # Standardize text formatting
        "clean_artifacts": True,  # Remove speech artifacts
        "max_chunk_size": 2048  # Maximum text chunk size for processing
    }
}

def validate_config(config: Dict[str, Any]) -> bool:
    """
    Validates configuration values against required ranges and types.
    
    Args:
        config: Configuration dictionary to validate
        
    Returns:
        bool: True if configuration is valid, raises ValueError otherwise
    """
    # Required configuration sections
    required_sections = ["topic_detection", "action_item_recognition", "summary_generation", "preprocessing"]
    
    # Validate presence of required sections
    for section in required_sections:
        if section not in config:
            raise ValueError(f"Missing required configuration section: {section}")
    
    # Validate topic detection settings
    td_config = config["topic_detection"]
    if not (0 < td_config["confidence_threshold"] <= 1.0):
        raise ValueError("Topic detection confidence threshold must be between 0 and 1")
    if not (0 < td_config["performance_target"] <= 1.0):
        raise ValueError("Topic detection performance target must be between 0 and 1")
    
    # Validate action item recognition settings
    air_config = config["action_item_recognition"]
    if not (0 < air_config["confidence_threshold"] <= 1.0):
        raise ValueError("Action item recognition confidence threshold must be between 0 and 1")
    if not (0 < air_config["performance_target"] <= 1.0):
        raise ValueError("Action item recognition performance target must be between 0 and 1")
    
    # Validate summary generation settings
    sg_config = config["summary_generation"]
    if not (0 < sg_config["performance_target"] <= 1.0):
        raise ValueError("Summary generation performance target must be between 0 and 1")
    if sg_config["min_length"] >= sg_config["max_length"]:
        raise ValueError("Summary min_length must be less than max_length")
    
    return True

def load_config() -> Dict[str, Any]:
    """
    Loads and validates AI engine configuration from environment variables and defaults.
    
    Returns:
        Dict[str, Any]: Validated configuration dictionary
    """
    config = AI_ENGINE_CONFIG.copy()
    
    # Override with environment variables if present
    env_overrides = {
        "TOPIC_DETECTION_MODEL": ("topic_detection", "model_name"),
        "ACTION_ITEM_MODEL": ("action_item_recognition", "model_name"),
        "SUMMARY_MODEL": ("summary_generation", "model_name"),
        "DEVICE": ("device",),  # Global device override
        "MAX_TOPICS": ("topic_detection", "max_topics"),
        "MAX_ACTION_ITEMS": ("action_item_recognition", "max_items"),
        "PREPROCESSING_CHUNK_SIZE": ("preprocessing", "max_chunk_size")
    }
    
    for env_var, config_path in env_overrides.items():
        if env_value := os.getenv(env_var):
            if len(config_path) == 1:
                # Global override
                for section in ["topic_detection", "action_item_recognition", "summary_generation"]:
                    config[section]["device"] = env_value
            else:
                # Section-specific override
                section, key = config_path
                config[section][key] = type(config[section][key])(env_value)  # Convert to appropriate type
    
    # Validate the final configuration
    validate_config(config)
    
    return config

# Validate default configuration on module import
validate_config(AI_ENGINE_CONFIG)