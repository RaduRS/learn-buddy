'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { Volume2, VolumeX, Play, Pause, RotateCcw, Star, Music, Heart } from 'lucide-react';

interface Note {
  name: string;
  frequency: number;
  color: string;
  isBlack?: boolean;
}

interface MusicLearningGameProps {
  userId: string;
  gameId: string;
  userAge: number;
  onGameComplete: (score: number, totalQuestions: number) => void;
}

interface GameMode {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

interface RhythmPattern {
  beats: boolean[];
  name: string;
  tempo: number;
}

const NOTES: Note[] = [
  { name: 'C', frequency: 261.63, color: '#FF6B6B' },
  { name: 'C#', frequency: 277.18, color: '#4ECDC4', isBlack: true },
  { name: 'D', frequency: 293.66, color: '#45B7D1' },
  { name: 'D#', frequency: 311.13, color: '#96CEB4', isBlack: true },
  { name: 'E', frequency: 329.63, color: '#FFEAA7' },
  { name: 'F', frequency: 349.23, color: '#DDA0DD' },
  { name: 'F#', frequency: 369.99, color: '#98D8C8', isBlack: true },
  { name: 'G', frequency: 392.00, color: '#F7DC6F' },
  { name: 'G#', frequency: 415.30, color: '#BB8FCE', isBlack: true },
  { name: 'A', frequency: 440.00, color: '#85C1E9' },
  { name: 'A#', frequency: 466.16, color: '#F8C471', isBlack: true },
  { name: 'B', frequency: 493.88, color: '#82E0AA' },
];

const GAME_MODES: GameMode[] = [
  {
    id: 'free-play',
    name: 'Free Play',
    description: 'Play the piano freely and explore sounds!',
    icon: <Music className="w-6 h-6" />
  },
  {
    id: 'note-recognition',
    name: 'Note Recognition',
    description: 'Listen and identify the correct note!',
    icon: <Volume2 className="w-6 h-6" />
  },
  {
    id: 'rhythm-game',
    name: 'Rhythm Game',
    description: 'Follow the rhythm pattern!',
    icon: <Heart className="w-6 h-6" />
  },
  {
    id: 'melody-maker',
    name: 'Melody Maker',
    description: 'Create your own beautiful melodies!',
    icon: <Star className="w-6 h-6" />
  }
];

const RHYTHM_PATTERNS: RhythmPattern[] = [
  { beats: [true, false, true, false], name: 'Simple Beat', tempo: 120 },
  { beats: [true, true, false, true], name: 'Fun Pattern', tempo: 100 },
  { beats: [true, false, false, true, true, false], name: 'Advanced', tempo: 140 },
];

export default function MusicLearningGame({ userId, gameId, userAge, onGameComplete }: MusicLearningGameProps) {
  const [currentMode, setCurrentMode] = useState<string>('free-play');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Note Recognition Game State
  const [targetNote, setTargetNote] = useState<Note | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  
  // Rhythm Game State
  const [currentPattern, setCurrentPattern] = useState<RhythmPattern | null>(null);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [playerPattern, setPlayerPattern] = useState<boolean[]>([]);
  const [rhythmPlaying, setRhythmPlaying] = useState(false);
  
  // Melody Maker State
  const [recordedMelody, setRecordedMelody] = useState<Note[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  
  // Audio Context
  const audioContextRef = useRef<AudioContext | null>(null);
  const rhythmIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initialize Web Audio API
    if (typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
    }
    
    return () => {
      if (rhythmIntervalRef.current) {
        clearInterval(rhythmIntervalRef.current);
      }
    };
  }, []);

  const playNote = useCallback((note: Note, duration: number = 0.5) => {
    if (isMuted || !audioContextRef.current) return;

    const context = audioContextRef.current;
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.frequency.setValueAtTime(note.frequency, context.currentTime);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + duration);

    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + duration);

    // Add to recorded melody if recording
    if (isRecording && currentMode === 'melody-maker') {
      setRecordedMelody(prev => [...prev, note]);
    }
  }, [isMuted, isRecording, currentMode]);

  const startNoteRecognitionGame = useCallback(() => {
    const randomNote = NOTES[Math.floor(Math.random() * NOTES.length)];
    setTargetNote(randomNote);
    setShowFeedback(false);
    
    // Play the note automatically
    setTimeout(() => {
      playNote(randomNote, 1);
    }, 500);
  }, [playNote]);

  const handleNoteGuess = useCallback((guessedNote: Note) => {
    if (!targetNote) return;
    
    const isCorrect = guessedNote.name === targetNote.name;
    setTotalQuestions(prev => prev + 1);
    
    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
      setScore(prev => prev + 10);
      setFeedbackMessage('🎉 Correct! Great job!');
    } else {
      setFeedbackMessage(`❌ That was ${guessedNote.name}. The correct answer was ${targetNote.name}. Try again!`);
    }
    
    setShowFeedback(true);
    
    // Start next question after delay
    setTimeout(() => {
      startNoteRecognitionGame();
    }, 2000);
  }, [targetNote, startNoteRecognitionGame]);

  const startRhythmGame = useCallback(() => {
    const pattern = RHYTHM_PATTERNS[Math.floor(Math.random() * RHYTHM_PATTERNS.length)];
    setCurrentPattern(pattern);
    setCurrentBeat(0);
    setPlayerPattern([]);
    setRhythmPlaying(true);
    
    // Play the pattern
    let beatIndex = 0;
    rhythmIntervalRef.current = setInterval(() => {
      if (beatIndex >= pattern.beats.length) {
        clearInterval(rhythmIntervalRef.current!);
        setRhythmPlaying(false);
        setCurrentBeat(0);
        return;
      }
      
      setCurrentBeat(beatIndex);
      if (pattern.beats[beatIndex] && !isMuted) {
        // Play a drum sound (using a low frequency note)
        playNote({ name: 'C', frequency: 130.81, color: '#FF6B6B' }, 0.2);
      }
      beatIndex++;
    }, 60000 / pattern.tempo);
  }, [playNote, isMuted]);

  const handleRhythmTap = useCallback(() => {
    if (!currentPattern || rhythmPlaying) return;
    
    const newPattern = [...playerPattern, true];
    setPlayerPattern(newPattern);
    
    // Play tap sound
    playNote({ name: 'C', frequency: 523.25, color: '#FF6B6B' }, 0.1);
    
    // Check if pattern is complete
    if (newPattern.length === currentPattern.beats.length) {
      // Simple scoring - give points for any attempt
      setScore(prev => prev + 5);
      setTimeout(() => {
        startRhythmGame();
      }, 1000);
    }
  }, [currentPattern, rhythmPlaying, playerPattern, playNote, startRhythmGame]);

  const playRecordedMelody = useCallback(() => {
    if (recordedMelody.length === 0) return;
    
    setIsPlaying(true);
    recordedMelody.forEach((note, index) => {
      setTimeout(() => {
        playNote(note, 0.5);
        if (index === recordedMelody.length - 1) {
          setIsPlaying(false);
        }
      }, index * 600);
    });
  }, [recordedMelody, playNote]);

  const clearMelody = useCallback(() => {
    setRecordedMelody([]);
    setIsRecording(false);
  }, []);

  useEffect(() => {
    if (currentMode === 'note-recognition' && !targetNote) {
      startNoteRecognitionGame();
    }
  }, [currentMode, targetNote, startNoteRecognitionGame]);

  const renderPiano = () => {
    const whiteKeys = NOTES.filter(note => !note.isBlack);
    const blackKeys = NOTES.filter(note => note.isBlack);

    return (
      <div className="relative mx-auto" style={{ width: 'fit-content' }}>
        {/* White Keys */}
        <div className="flex">
          {whiteKeys.map((note, index) => (
            <button
              key={note.name}
              className="w-12 h-32 bg-white border-2 border-gray-300 hover:bg-gray-100 active:bg-gray-200 transition-colors duration-150 flex items-end justify-center pb-2 text-sm font-semibold"
              style={{ 
                borderColor: note.color,
                boxShadow: `0 4px 8px ${note.color}40`
              }}
              onClick={() => {
                playNote(note);
                if (currentMode === 'note-recognition') {
                  handleNoteGuess(note);
                }
              }}
            >
              {note.name}
            </button>
          ))}
        </div>
        
        {/* Black Keys */}
        <div className="absolute top-0 flex">
          {whiteKeys.map((_, index) => {
            const blackKey = blackKeys.find(black => {
              const whiteNote = whiteKeys[index].name;
              return (
                (whiteNote === 'C' && black.name === 'C#') ||
                (whiteNote === 'D' && black.name === 'D#') ||
                (whiteNote === 'F' && black.name === 'F#') ||
                (whiteNote === 'G' && black.name === 'G#') ||
                (whiteNote === 'A' && black.name === 'A#')
              );
            });
            
            if (!blackKey) {
              return <div key={index} className="w-12" />;
            }
            
            return (
              <div key={index} className="w-12 flex justify-end">
                <button
                  className="w-8 h-20 bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-white text-xs font-semibold flex items-end justify-center pb-1 transition-colors duration-150"
                  style={{ 
                    backgroundColor: blackKey.color,
                    boxShadow: `0 2px 4px ${blackKey.color}60`
                  }}
                  onClick={() => {
                    playNote(blackKey);
                    if (currentMode === 'note-recognition') {
                      handleNoteGuess(blackKey);
                    }
                  }}
                >
                  {blackKey.name}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderGameContent = () => {
    switch (currentMode) {
      case 'free-play':
        return (
          <div className="text-center space-y-4">
            <h3 className="text-xl font-bold text-purple-700">🎹 Free Play Mode</h3>
            <p className="text-gray-600">Click on the piano keys to make beautiful music!</p>
            {renderPiano()}
            <div className="text-sm text-gray-500 mt-4">
              Try playing different combinations of notes to create melodies!
            </div>
          </div>
        );

      case 'note-recognition':
        return (
          <div className="text-center space-y-4">
            <h3 className="text-xl font-bold text-purple-700">🎵 Note Recognition</h3>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-gray-700 mb-2">Listen to the note and click the correct key!</p>
              {targetNote && (
                <div className="text-lg font-semibold text-blue-600">
                  🎵 Listen carefully and find the note!
                </div>
              )}
              {showFeedback && (
                <div className="mt-2 p-2 bg-white rounded border">
                  {feedbackMessage}
                </div>
              )}
            </div>
            {renderPiano()}
            <div className="flex justify-center gap-4 text-sm">
              <Badge variant="secondary">
                Correct: {correctAnswers}/{totalQuestions}
              </Badge>
              {targetNote && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => playNote(targetNote, 1)}
                >
                  🔊 Play Again
                </Button>
              )}
            </div>
          </div>
        );

      case 'rhythm-game':
        return (
          <div className="text-center space-y-4">
            <h3 className="text-xl font-bold text-purple-700">🥁 Rhythm Game</h3>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-gray-700 mb-4">Listen to the rhythm, then tap the button to copy it!</p>
              
              {currentPattern && (
                <div className="space-y-4">
                  <div className="text-lg font-semibold">
                    Pattern: {currentPattern.name}
                  </div>
                  
                  {/* Visual rhythm display */}
                  <div className="flex justify-center gap-2">
                    {currentPattern.beats.map((beat, index) => (
                      <div
                        key={index}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                          beat 
                            ? 'bg-green-500 border-green-600' 
                            : 'bg-gray-200 border-gray-300'
                        } ${
                          rhythmPlaying && index === currentBeat 
                            ? 'ring-4 ring-yellow-400' 
                            : ''
                        }`}
                      >
                        {beat ? '♪' : '○'}
                      </div>
                    ))}
                  </div>
                  
                  {!rhythmPlaying && (
                    <div className="space-y-2">
                      <Button
                        onClick={handleRhythmTap}
                        className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 text-lg"
                        disabled={rhythmPlaying}
                      >
                        🥁 TAP!
                      </Button>
                      <div className="text-sm text-gray-600">
                        Tapped: {playerPattern.length}/{currentPattern.beats.length}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <Button
                onClick={startRhythmGame}
                variant="outline"
                className="mt-4"
              >
                🔄 New Pattern
              </Button>
            </div>
          </div>
        );

      case 'melody-maker':
        return (
          <div className="text-center space-y-4">
            <h3 className="text-xl font-bold text-purple-700">🎼 Melody Maker</h3>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-gray-700 mb-4">Create your own melody by playing the piano!</p>
              
              <div className="flex justify-center gap-2 mb-4">
                <Button
                  onClick={() => setIsRecording(!isRecording)}
                  variant={isRecording ? "destructive" : "default"}
                  className="flex items-center gap-2"
                >
                  {isRecording ? (
                    <>
                      <Pause className="w-4 h-4" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Start Recording
                    </>
                  )}
                </Button>
                
                {recordedMelody.length > 0 && (
                  <>
                    <Button
                      onClick={playRecordedMelody}
                      variant="outline"
                      disabled={isPlaying}
                      className="flex items-center gap-2"
                    >
                      <Volume2 className="w-4 h-4" />
                      Play Melody
                    </Button>
                    
                    <Button
                      onClick={clearMelody}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Clear
                    </Button>
                  </>
                )}
              </div>
              
              {recordedMelody.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm font-semibold mb-2">Your Melody:</div>
                  <div className="flex flex-wrap justify-center gap-1">
                    {recordedMelody.map((note, index) => (
                      <Badge
                        key={index}
                        style={{ backgroundColor: note.color }}
                        className="text-white"
                      >
                        {note.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {isRecording && (
                <div className="text-red-600 font-semibold animate-pulse">
                  🔴 Recording... Play some notes!
                </div>
              )}
            </div>
            
            {renderPiano()}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold text-purple-700 flex items-center gap-2">
              🎵 Music Learning Game
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                Score: {score}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Game Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Choose Your Game Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {GAME_MODES.map((mode) => (
              <Button
                key={mode.id}
                variant={currentMode === mode.id ? "default" : "outline"}
                className={`h-auto p-4 flex flex-col items-center gap-2 ${
                  currentMode === mode.id ? 'bg-purple-600 hover:bg-purple-700' : ''
                }`}
                onClick={() => setCurrentMode(mode.id)}
              >
                {mode.icon}
                <div className="text-center">
                  <div className="font-semibold">{mode.name}</div>
                  <div className="text-xs opacity-80">{mode.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Game Content */}
      <Card>
        <CardContent className="p-6">
          {renderGameContent()}
        </CardContent>
      </Card>

      {/* Progress */}
      {(currentMode === 'note-recognition' && totalQuestions > 0) && (
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-sm font-semibold mb-2">Progress</div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(correctAnswers / totalQuestions) * 100}%` }}
                />
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {correctAnswers} correct out of {totalQuestions} questions
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}