/**
 * @fileoverview Enterprise-grade utility service for processing and cleaning Microsoft Teams meeting transcriptions
 * @version 1.0.0
 */

import { natural } from 'natural'; // v6.0.0
import { Transcription, SpeakerData, TranscriptionMetadata } from '../../shared/types/transcription.types';
import { handleError } from '../../shared/utils/error-handler';
import { Logger } from '../../shared/utils/logger';
import { ErrorCode } from '../../shared/constants/error-codes';

// Performance optimization constants
const CHUNK_SIZE = 5000; // Characters per chunk for memory optimization
const MAX_PARALLEL_CHUNKS = 4;
const NOISE_THRESHOLD = 0.3;
const CONFIDENCE_THRESHOLD = 0.85;

/**
 * Enterprise-grade text processor for meeting transcriptions
 */
export class TextProcessor {
  private readonly logger: Logger;
  private readonly nlpProcessor: natural.WordTokenizer;
  private readonly fillerWords: Set<string>;

  constructor(logger: Logger) {
    this.logger = logger;
    this.nlpProcessor = new natural.WordTokenizer();
    this.fillerWords = new Set([
      'um', 'uh', 'ah', 'er', 'like', 'you know', 'sort of', 'kind of',
      'basically', 'literally', 'actually', 'so yeah', 'right'
    ]);
  }

  /**
   * Process complete transcription with performance optimization
   */
  public async processTranscription(transcription: Transcription): Promise<Transcription> {
    try {
      this.logger.info('Starting transcription processing', {
        transcriptionId: transcription.id,
        meetingId: transcription.meetingId
      });

      const startTime = Date.now();

      // Process text content
      const cleanedContent = await this.cleanTranscriptionText(transcription.content);
      
      // Process speaker data
      const processedSpeakerData = await this.processSpeakerData(transcription.speakerData);
      
      // Calculate noise level
      const noiseLevel = await this.calculateNoiseLevel(cleanedContent, processedSpeakerData);

      // Update metadata
      const updatedMetadata: TranscriptionMetadata = {
        ...transcription.metadata,
        noiseLevel,
        processingDuration: Date.now() - startTime,
        wordCount: this.nlpProcessor.tokenize(cleanedContent).length,
        qualityScore: this.calculateQualityScore(noiseLevel, processedSpeakerData)
      };

      this.logger.info('Transcription processing completed', {
        transcriptionId: transcription.id,
        duration: updatedMetadata.processingDuration,
        wordCount: updatedMetadata.wordCount
      });

      return {
        ...transcription,
        content: cleanedContent,
        speakerData: processedSpeakerData,
        metadata: updatedMetadata
      };
    } catch (error) {
      throw await handleError(error, {
        transcriptionId: transcription.id,
        operation: 'processTranscription'
      });
    }
  }

  /**
   * Process transcription chunks for real-time handling
   */
  public async processChunk(chunk: string, speakerData: SpeakerData): Promise<{
    content: string;
    speakerData: SpeakerData;
    noiseLevel: number;
  }> {
    try {
      const cleanedContent = await this.cleanTranscriptionText(chunk);
      const processedSpeakerData = await this.processSpeakerData([speakerData]);
      const noiseLevel = await this.calculateNoiseLevel(cleanedContent, processedSpeakerData);

      return {
        content: cleanedContent,
        speakerData: processedSpeakerData[0],
        noiseLevel
      };
    } catch (error) {
      throw await handleError(error, {
        operation: 'processChunk',
        chunkSize: chunk.length
      });
    }
  }

  /**
   * Clean and normalize transcription text
   */
  private async cleanTranscriptionText(rawText: string): Promise<string> {
    try {
      // Split text into manageable chunks for memory optimization
      const chunks = this.splitIntoChunks(rawText, CHUNK_SIZE);
      const processedChunks = await Promise.all(
        chunks.map(async (chunk) => {
          // Remove filler words
          let processed = this.removeFillerWords(chunk);
          
          // Normalize whitespace and punctuation
          processed = this.normalizeText(processed);
          
          // Fix common transcription errors
          processed = this.fixTranscriptionErrors(processed);
          
          return processed;
        })
      );

      return processedChunks.join(' ').trim();
    } catch (error) {
      throw await handleError(error, {
        operation: 'cleanTranscriptionText',
        textLength: rawText.length
      });
    }
  }

  /**
   * Process and validate speaker data
   */
  private async processSpeakerData(speakerData: ReadonlyArray<SpeakerData>): Promise<ReadonlyArray<SpeakerData>> {
    try {
      return speakerData.map(speaker => ({
        ...speaker,
        confidence: this.calculateSpeakerConfidence(speaker)
      }));
    } catch (error) {
      throw await handleError(error, {
        operation: 'processSpeakerData',
        speakerCount: speakerData.length
      });
    }
  }

  /**
   * Calculate noise level in transcription
   */
  private async calculateNoiseLevel(text: string, speakerData: ReadonlyArray<SpeakerData>): Promise<number> {
    try {
      const textNoiseScore = this.calculateTextNoiseScore(text);
      const speakerNoiseScore = this.calculateSpeakerNoiseScore(speakerData);
      
      // Weighted average of noise scores
      return Math.round((textNoiseScore * 0.7 + speakerNoiseScore * 0.3) * 100) / 100;
    } catch (error) {
      throw await handleError(error, {
        operation: 'calculateNoiseLevel'
      });
    }
  }

  /**
   * Helper methods for text processing
   */
  private splitIntoChunks(text: string, size: number): string[] {
    return text.match(new RegExp(`.{1,${size}}`, 'g')) || [];
  }

  private removeFillerWords(text: string): string {
    return text.split(' ')
      .filter(word => !this.fillerWords.has(word.toLowerCase()))
      .join(' ');
  }

  private normalizeText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/([.!?])\s*(?=[A-Z])/g, '$1\n') // Add newlines after sentences
      .replace(/\b(\w+)\s+\1\b/gi, '$1') // Remove word repetitions
      .trim();
  }

  private fixTranscriptionErrors(text: string): string {
    return text
      .replace(/(?<=\b)\w(?=\b)/g, match => match.toLowerCase()) // Fix single-letter capitalization
      .replace(/(?<=\.\s)\w/g, match => match.toUpperCase()) // Capitalize sentence starts
      .replace(/\b(i|I)\b(?!')/g, 'I') // Fix standalone 'i' to 'I'
      .replace(/\b(ok|Ok)\b/g, 'OK'); // Normalize "OK"
  }

  private calculateSpeakerConfidence(speaker: SpeakerData): number {
    return Math.min(
      speaker.confidence,
      speaker.endTime.getTime() - speaker.startTime.getTime() > 500 ? 1 : 0.8
    );
  }

  private calculateTextNoiseScore(text: string): number {
    const words = this.nlpProcessor.tokenize(text);
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    return 1 - (uniqueWords.size / words.length);
  }

  private calculateSpeakerNoiseScore(speakerData: ReadonlyArray<SpeakerData>): number {
    const confidences = speakerData.map(s => s.confidence);
    return confidences.reduce((acc, val) => acc + val, 0) / confidences.length;
  }

  private calculateQualityScore(noiseLevel: number, speakerData: ReadonlyArray<SpeakerData>): number {
    const confidenceScore = speakerData.reduce((acc, s) => acc + s.confidence, 0) / speakerData.length;
    return Math.round((1 - noiseLevel) * confidenceScore * 100);
  }
}

// Export utility functions
export const cleanTranscriptionText = async (
  text: string,
  logger: Logger
): Promise<string> => {
  const processor = new TextProcessor(logger);
  return processor.cleanTranscriptionText(text);
};