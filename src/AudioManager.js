/**
 * AudioManager - BGMと効果音を管理
 */
export class AudioManager {
    constructor() {
        this.audioContext = null;
        this.currentBGM = null;
        this.currentGainNode = null;
        this.isPlaying = false;
    }

    /**
     * AudioContextを初期化（ユーザーインタラクション後に呼ぶ）
     */
    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    /**
     * BGMを停止
     */
    stopBGM() {
        this.isPlaying = false; // 先にフラグをfalseにしてループを止める

        if (this.currentBGM) {
            this.currentBGM.forEach(osc => {
                try {
                    osc.stop();
                    osc.disconnect();
                } catch (e) {
                    // 既に停止している場合は無視
                }
            });
            this.currentBGM = [];
        }
        if (this.currentGainNode) {
            try {
                this.currentGainNode.disconnect();
            } catch (e) {
                // 既に切断されている場合は無視
            }
            this.currentGainNode = null;
        }
    }

    /**
     * DEMO MODE用のBGM（明るく元気なメロディー）
     */
    playDemoBGM() {
        this.init();
        this.stopBGM();

        const melody = [
            // フレーズ1
            { note: 'E5', duration: 0.15 },
            { note: 'E5', duration: 0.15 },
            { note: 'rest', duration: 0.15 },
            { note: 'E5', duration: 0.15 },
            { note: 'rest', duration: 0.15 },
            { note: 'C5', duration: 0.15 },
            { note: 'E5', duration: 0.15 },
            { note: 'rest', duration: 0.15 },
            { note: 'G5', duration: 0.3 },
            { note: 'rest', duration: 0.3 },
            { note: 'G4', duration: 0.3 },
            { note: 'rest', duration: 0.3 },

            // フレーズ2
            { note: 'C5', duration: 0.3 },
            { note: 'rest', duration: 0.15 },
            { note: 'G4', duration: 0.3 },
            { note: 'rest', duration: 0.3 },
            { note: 'E4', duration: 0.3 },
            { note: 'rest', duration: 0.15 },
            { note: 'A4', duration: 0.3 },
            { note: 'B4', duration: 0.3 },
            { note: 'A4', duration: 0.15 },
            { note: 'G4', duration: 0.45 },

            // フレーズ3（繰り返し）
            { note: 'E5', duration: 0.2 },
            { note: 'G5', duration: 0.2 },
            { note: 'A5', duration: 0.3 },
            { note: 'F5', duration: 0.15 },
            { note: 'G5', duration: 0.3 },
            { note: 'rest', duration: 0.15 },
            { note: 'E5', duration: 0.3 },
            { note: 'C5', duration: 0.15 },
            { note: 'D5', duration: 0.15 },
            { note: 'B4', duration: 0.45 }
        ];

        this.playMelody(melody, true);
        this.isPlaying = true;
    }

    /**
     * OPENAI MODE用のBGM（少しミステリアスで知的なメロディー）
     */
    playAIModeBGM() {
        this.init();
        this.stopBGM();

        const melody = [
            // フレーズ1（上昇アルペジオ）
            { note: 'C5', duration: 0.2 },
            { note: 'E5', duration: 0.2 },
            { note: 'G5', duration: 0.2 },
            { note: 'B5', duration: 0.2 },
            { note: 'A5', duration: 0.3 },
            { note: 'G5', duration: 0.2 },
            { note: 'E5', duration: 0.2 },
            { note: 'C5', duration: 0.3 },

            // フレーズ2（下降とリズム）
            { note: 'D5', duration: 0.2 },
            { note: 'F5', duration: 0.2 },
            { note: 'A5', duration: 0.3 },
            { note: 'G5', duration: 0.4 },
            { note: 'rest', duration: 0.2 },

            // フレーズ3（変化のあるパターン）
            { note: 'E5', duration: 0.15 },
            { note: 'D5', duration: 0.15 },
            { note: 'C5', duration: 0.2 },
            { note: 'B4', duration: 0.2 },
            { note: 'A4', duration: 0.3 },
            { note: 'rest', duration: 0.2 },
            { note: 'C5', duration: 0.2 },
            { note: 'E5', duration: 0.2 },
            { note: 'G5', duration: 0.4 },

            // フレーズ4（クロージング）
            { note: 'F5', duration: 0.2 },
            { note: 'E5', duration: 0.2 },
            { note: 'D5', duration: 0.2 },
            { note: 'C5', duration: 0.4 },
            { note: 'rest', duration: 0.2 }
        ];

        this.playMelody(melody, true);
        this.isPlaying = true;
    }

    /**
     * メロディーを再生（改善版：正確なループ）
     */
    playMelody(melody, loop = false) {
        this.currentBGM = [];

        const playSequence = (startTime) => {
            if (!this.isPlaying) return;

            let currentTime = startTime;
            let sequenceDuration = 0;

            // メロディー全体の長さを計算
            melody.forEach(note => {
                sequenceDuration += note.duration;
            });

            // 各音符をスケジュール
            melody.forEach((note, index) => {
                if (note.note === 'rest') {
                    currentTime += note.duration;
                    return;
                }

                const freq = this.getNoteFrequency(note.note);
                const osc = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();

                osc.type = 'square'; // チップチューン風の矩形波
                osc.frequency.setValueAtTime(freq, currentTime);

                // エンベロープ（音量の変化）
                gainNode.gain.setValueAtTime(0, currentTime);
                gainNode.gain.linearRampToValueAtTime(0.15, currentTime + 0.01);
                gainNode.gain.linearRampToValueAtTime(0.1, currentTime + note.duration * 0.8);
                gainNode.gain.linearRampToValueAtTime(0, currentTime + note.duration);

                osc.connect(gainNode);
                gainNode.connect(this.audioContext.destination);

                osc.start(currentTime);
                osc.stop(currentTime + note.duration);

                this.currentBGM.push(osc);
                currentTime += note.duration;
            });

            // ループ再生（Web Audio APIの時刻を使用）
            if (loop && this.isPlaying) {
                // 現在のシーケンスの終了時刻を計算
                const nextStartTime = startTime + sequenceDuration;

                // 次のシーケンスをスケジュール（少し前にスケジュールして隙間を防ぐ）
                const currentAudioTime = this.audioContext.currentTime;
                const timeUntilNext = (nextStartTime - currentAudioTime) * 1000;

                setTimeout(() => {
                    playSequence(nextStartTime);
                }, Math.max(0, timeUntilNext - 100)); // 100ms前にスケジュール
            }
        };

        // 最初のシーケンスを開始
        playSequence(this.audioContext.currentTime);
    }

    /**
     * TIME UP効果音
     */
    playTimeUpSound() {
        this.init();

        const now = this.audioContext.currentTime;

        // 下降音（ゲームオーバー風）
        for (let i = 0; i < 8; i++) {
            const osc = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(440 - i * 50, now + i * 0.08);

            gainNode.gain.setValueAtTime(0, now + i * 0.08);
            gainNode.gain.linearRampToValueAtTime(0.2, now + i * 0.08 + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, now + i * 0.08 + 0.08);

            osc.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.08);
        }
    }

    /**
     * クリア効果音
     */
    playClearSound() {
        this.init();

        const now = this.audioContext.currentTime;

        // 上昇音（勝利のファンファーレ風）
        const notes = ['C5', 'E5', 'G5', 'C6'];
        notes.forEach((note, i) => {
            const osc = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(this.getNoteFrequency(note), now + i * 0.15);

            gainNode.gain.setValueAtTime(0, now + i * 0.15);
            gainNode.gain.linearRampToValueAtTime(0.2, now + i * 0.15 + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, now + i * 0.15 + 0.15);

            osc.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            osc.start(now + i * 0.15);
            osc.stop(now + i * 0.15 + 0.15);
        });
    }

    /**
     * ジャンプ効果音
     */
    playJumpSound() {
        this.init();

        const now = this.audioContext.currentTime;
        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);

        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        osc.start(now);
        osc.stop(now + 0.1);
    }

    /**
     * 音符名から周波数を取得
     */
    getNoteFrequency(note) {
        const notes = {
            'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23,
            'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
            'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46,
            'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
            'C6': 1046.50, 'D6': 1174.66, 'E6': 1318.51
        };
        return notes[note] || 440;
    }
}
