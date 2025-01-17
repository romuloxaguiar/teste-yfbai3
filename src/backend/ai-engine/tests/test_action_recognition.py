"""
Unit and integration tests for the action item recognition model.
Tests accuracy, performance, and reliability of action item detection.

Dependencies:
pytest==7.0.0
numpy==1.23.0
torch==2.0.0
"""

import pytest
import numpy as np
import torch
import time
from typing import Dict, List, Optional
from datetime import datetime, timedelta

from models.action_item_recognition import ActionItemRecognizer
from config import AI_ENGINE_CONFIG

# Test data fixtures
SAMPLE_TRANSCRIPTS = [
    "John will prepare the project report by next Friday.",
    "Sarah needs to review the code changes before Thursday.",
    "Team agreed to schedule a follow-up meeting next week.",
    "Action item: Mike to update documentation by EOD.",
    "Please ensure the deployment is completed by tomorrow - assigned to David."
]

GROUND_TRUTH = [
    {
        'text': "John will prepare the project report by next Friday.",
        'assignee': "John",
        'has_deadline': True,
        'is_action_item': True
    },
    {
        'text': "Sarah needs to review the code changes before Thursday.",
        'assignee': "Sarah",
        'has_deadline': True,
        'is_action_item': True
    },
    {
        'text': "Team agreed to schedule a follow-up meeting next week.",
        'assignee': None,
        'has_deadline': True,
        'is_action_item': False
    },
    {
        'text': "Action item: Mike to update documentation by EOD.",
        'assignee': "Mike",
        'has_deadline': True,
        'is_action_item': True
    },
    {
        'text': "Please ensure the deployment is completed by tomorrow - assigned to David.",
        'assignee': "David",
        'has_deadline': True,
        'is_action_item': True
    }
]

@pytest.fixture(scope='module')
def setup_module():
    """Module-level setup for action recognition tests."""
    # Initialize test configuration
    test_config = AI_ENGINE_CONFIG.copy()
    test_config['action_item_recognition'].update({
        'confidence_threshold': 0.8,
        'batch_size': 16,
        'device': 'cuda' if torch.cuda.is_available() else 'cpu'
    })

    # Initialize model
    recognizer = ActionItemRecognizer(test_config)
    
    return recognizer

class TestActionItemRecognition:
    """Test suite for action item recognition functionality."""
    
    @classmethod
    def setup_class(cls):
        """Class-level setup for test suite."""
        cls._test_config = AI_ENGINE_CONFIG['action_item_recognition']
        cls._performance_metrics = {
            'accuracy': [],
            'processing_times': [],
            'memory_usage': []
        }
        
        # Configure GPU if available
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            cls._initial_memory = torch.cuda.memory_allocated()
    
    def test_action_item_detection_accuracy(self, setup_module):
        """Tests accuracy of action item detection against labeled test data."""
        recognizer = setup_module
        
        # Track metrics
        true_positives = 0
        false_positives = 0
        false_negatives = 0
        
        start_time = time.time()
        
        # Process test samples
        for transcript, truth in zip(SAMPLE_TRANSCRIPTS, GROUND_TRUTH):
            detected_items = recognizer.detect_action_items(transcript)
            
            # Validate detection
            if truth['is_action_item']:
                if detected_items:
                    true_positives += 1
                else:
                    false_negatives += 1
            else:
                if detected_items:
                    false_positives += 1
                    
            # Validate metadata if action item detected
            if detected_items:
                item = detected_items[0]
                assert 'confidence' in item, "Confidence score missing"
                assert item['confidence'] >= self._test_config['confidence_threshold']
                
                if truth['assignee']:
                    assert 'assignee' in item['metadata'], "Assignee metadata missing"
                
                if truth['has_deadline']:
                    assert 'deadline' in item['metadata'], "Deadline metadata missing"
        
        # Calculate metrics
        total_time = time.time() - start_time
        precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0
        recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 0
        f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        
        # Update performance metrics
        self._performance_metrics['accuracy'].append(f1_score)
        self._performance_metrics['processing_times'].append(total_time)
        
        # Assert accuracy requirements
        assert f1_score >= 0.90, f"Accuracy below 90% requirement: {f1_score:.2f}"
        
    def test_metadata_extraction(self, setup_module):
        """Tests accuracy of metadata extraction from action items."""
        recognizer = setup_module
        
        # Test various metadata scenarios
        test_cases = [
            {
                'text': "John to complete review by next Monday 5pm",
                'expected': {
                    'assignee': 'John',
                    'has_deadline': True,
                    'priority': None
                }
            },
            {
                'text': "URGENT: Sarah and Mike to prepare presentation by EOD",
                'expected': {
                    'assignee': ['Sarah', 'Mike'],
                    'has_deadline': True,
                    'priority': 'high'
                }
            }
        ]
        
        for test_case in test_cases:
            metadata = recognizer.extract_metadata(test_case['text'])
            
            # Validate metadata structure
            assert isinstance(metadata, dict), "Invalid metadata format"
            assert 'assignee' in metadata, "Missing assignee field"
            assert 'deadline' in metadata, "Missing deadline field"
            assert 'priority' in metadata, "Missing priority field"
            
            # Validate specific fields
            if test_case['expected']['assignee']:
                if isinstance(test_case['expected']['assignee'], list):
                    assert isinstance(metadata['assignee'], list), "Invalid assignee format"
                    assert len(metadata['assignee']) == len(test_case['expected']['assignee'])
                else:
                    assert metadata['assignee'] == test_case['expected']['assignee']
                    
            if test_case['expected']['has_deadline']:
                assert metadata['deadline'] is not None
                assert isinstance(metadata['deadline'], str)
                # Validate deadline format
                try:
                    datetime.fromisoformat(metadata['deadline'])
                except ValueError:
                    pytest.fail("Invalid deadline format")
                    
            if test_case['expected']['priority']:
                assert metadata['priority'] == test_case['expected']['priority']
    
    def test_processing_time(self, setup_module):
        """Tests processing time performance against requirements."""
        recognizer = setup_module
        
        # Prepare test data of varying lengths
        test_lengths = [100, 500, 1000, 5000]  # characters
        test_texts = [
            "x" * length for length in test_lengths
        ]
        
        for text in test_texts:
            start_time = time.time()
            
            # Process text
            _ = recognizer.detect_action_items(text)
            
            processing_time = time.time() - start_time
            self._performance_metrics['processing_times'].append(processing_time)
            
            # Monitor memory usage
            if torch.cuda.is_available():
                memory_used = torch.cuda.memory_allocated() - self._initial_memory
                self._performance_metrics['memory_usage'].append(memory_used)
            
            # Assert processing time requirement
            assert processing_time < 300, f"Processing time exceeded 5 minute limit: {processing_time:.2f}s"
    
    def test_edge_cases(self, setup_module):
        """Tests model behavior with edge cases and invalid inputs."""
        recognizer = setup_module
        
        edge_cases = [
            "",  # Empty string
            "   ",  # Whitespace only
            "a" * 10000,  # Very long text
            "!@#$%^&*()",  # Special characters
            "Mixed language: English and 日本語",  # Multi-language
            None,  # None input
        ]
        
        for case in edge_cases:
            try:
                if case is not None:
                    result = recognizer.detect_action_items(case)
                    
                    # Validate result structure
                    assert isinstance(result, list), "Invalid result type"
                    
                    # Check confidence scores if items detected
                    for item in result:
                        assert 'confidence' in item, "Missing confidence score"
                        assert 0 <= item['confidence'] <= 1, "Invalid confidence score"
                        
            except Exception as e:
                if case is None:
                    assert isinstance(e, ValueError), "Expected ValueError for None input"
                else:
                    pytest.fail(f"Unexpected error for edge case: {str(e)}")
    
    @classmethod
    def teardown_class(cls):
        """Class-level cleanup after tests."""
        # Generate performance report
        avg_accuracy = np.mean(cls._performance_metrics['accuracy'])
        avg_processing_time = np.mean(cls._performance_metrics['processing_times'])
        
        print(f"\nPerformance Report:")
        print(f"Average Accuracy: {avg_accuracy:.2f}")
        print(f"Average Processing Time: {avg_processing_time:.2f}s")
        
        if cls._performance_metrics['memory_usage']:
            avg_memory = np.mean(cls._performance_metrics['memory_usage'])
            print(f"Average GPU Memory Usage: {avg_memory / 1024 / 1024:.2f}MB")
        
        # Cleanup GPU memory
        if torch.cuda.is_available():
            torch.cuda.empty_cache()