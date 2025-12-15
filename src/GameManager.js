import { LevelGenerator } from './LevelGenerator.js';
import { PlumberAgent } from './PlumberAgent.js';

/**
 * GameManager - ゲーム進行管理とAPI連携
 */
export class GameManager {
    constructor(scene) {
        this.scene = scene;
        this.levelGenerator = new LevelGenerator(scene);
        this.agent = null;
        this.plan = [];
        this.currentStep = 0;
        this.gameState = 'idle'; // idle, planning, running, success, failed
        this.timeRemaining = 30;
        this.score = 0;
        this.apiKey = null;

        // UI要素への参照
        this.timeDisplay = document.getElementById('time-display');
        this.scoreDisplay = document.getElementById('score-display');
        this.statusDisplay = document.getElementById('status-display');
        this.loadingDisplay = document.getElementById('loading');
    }

    /**
     * ゲーム開始
     */
    async startGame(apiKey = null) {
        this.apiKey = apiKey;
        this.gameState = 'planning';
        this.timeRemaining = 30;
        this.score = 0;
        this.currentStep = 0;

        // マップを生成
        const levelData = this.levelGenerator.generate();

        // エージェントを作成
        if (this.agent) {
            this.agent.remove();
        }
        this.agent = new PlumberAgent(this.scene, levelData.start);

        // AIプランニング
        this.showStatus('AI PLANNING...');
        this.loadingDisplay.style.display = 'block';

        try {
            this.plan = await this.getPlanFromAI(levelData);
            console.log('Plan received:', this.plan);

            this.loadingDisplay.style.display = 'none';
            this.showStatus('START!');
            setTimeout(() => this.hideStatus(), 1000);

            this.gameState = 'running';
        } catch (error) {
            console.error('Planning failed:', error);
            this.loadingDisplay.style.display = 'none';

            // APIが使えない場合、マップを考慮したデモプランを生成
            this.plan = this.generateSimplePath(levelData);
            this.showStatus('DEMO MODE');
            setTimeout(() => this.hideStatus(), 1000);

            this.gameState = 'running';
        }
    }

    /**
     * OpenAI APIからプランを取得
     */
    async getPlanFromAI(levelData) {
        // APIキーがない場合はデモプランを返す
        if (!this.apiKey) {
            throw new Error('No API key provided');
        }

        const prompt = this.createPrompt(levelData);

        // OpenAI API呼び出し（実装例）
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'あなたはマリオ風アクションゲームの達人AIです。与えられたマップ情報から、スタートからゴールまでの最適な行動計画を立ててください。'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7
            })
        });

        const data = await response.json();
        const planText = data.choices[0].message.content;

        // JSONを抽出
        const jsonMatch = planText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const planData = JSON.parse(jsonMatch[0]);
            return planData.plan || [];
        }

        throw new Error('Invalid plan format');
    }

    /**
     * AIへのプロンプトを作成
     */
    createPrompt(levelData) {
        let prompt = 'マップ情報:\n';
        prompt += `- Start: (${levelData.start.x}, ${levelData.start.y}, ${levelData.start.z})\n`;
        prompt += `- Goal (Star): (${levelData.goal.x}, ${levelData.goal.y}, ${levelData.goal.z})\n`;
        prompt += '- Blocks: [\n';

        levelData.blocks.forEach(block => {
            prompt += `  {id:${block.id}, x:${block.x}, y:${block.y}, z:${block.z}, type:"${block.type}"},\n`;
        });

        prompt += ']\n\n';
        prompt += '制約:\n';
        prompt += '- ジャンプ最大高さ = 1.5ブロック\n';
        prompt += '- ジャンプ最大距離 = 2.0ブロック\n';
        prompt += '- 移動速度 = 0.1/フレーム\n\n';
        prompt += '利用可能なアクション:\n';
        prompt += '- MOVE_FORWARD: 前進\n';
        prompt += '- TURN_RIGHT: 右に90度回転\n';
        prompt += '- TURN_LEFT: 左に90度回転\n';
        prompt += '- JUMP: ジャンプ（移動中も可能）\n\n';
        prompt += '以下のJSON形式で行動計画を返してください:\n';
        prompt += '{\n';
        prompt += '  "plan": ["MOVE_FORWARD", "JUMP", "MOVE_FORWARD", ...]\n';
        prompt += '}';

        return prompt;
    }

    /**
     * マップを考慮した簡単なパスプランニング（デモ用）
     */
    generateSimplePath(levelData) {
        const plan = [];
        const start = levelData.start;
        const goal = levelData.goal;
        const blocks = levelData.blocks;

        // 現在の位置と向き
        let currentX = start.x;
        let currentY = start.y;
        let currentZ = start.z;
        let directionX = 0;
        let directionZ = 1; // 初期方向は+Z（前方）

        console.log('Path planning:', { start, goal, blockCount: blocks.length });

        // ゴールに向かって進む
        for (let step = 0; step < 50; step++) {
            // ゴールとの距離をチェック
            const distToGoal = Math.sqrt(
                Math.pow(currentX - goal.x, 2) +
                Math.pow(currentZ - goal.z, 2)
            );

            if (distToGoal < 2) {
                // ゴールに十分近い
                break;
            }

            // ゴールまでの方向ベクトル
            const deltaX = goal.x - currentX;
            const deltaZ = goal.z - currentZ;

            // 次に進むべき方向を決定
            let targetDirX = 0;
            let targetDirZ = 0;

            if (Math.abs(deltaX) > Math.abs(deltaZ)) {
                // X方向に進む
                targetDirX = deltaX > 0 ? 1 : -1;
                targetDirZ = 0;
            } else {
                // Z方向に進む
                targetDirX = 0;
                targetDirZ = deltaZ > 0 ? 1 : -1;
            }

            // 方向転換が必要かチェック
            if (directionX !== targetDirX || directionZ !== targetDirZ) {
                // 必要な回転を計算
                const currentAngle = Math.atan2(directionX, directionZ);
                const targetAngle = Math.atan2(targetDirX, targetDirZ);
                let angleDiff = targetAngle - currentAngle;

                // 角度を-π〜πに正規化
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

                // 90度ずつ回転
                if (Math.abs(angleDiff) > 0.1) {
                    if (angleDiff > 0) {
                        plan.push('TURN_LEFT');
                        const temp = directionX;
                        directionX = -directionZ;
                        directionZ = temp;
                    } else {
                        plan.push('TURN_RIGHT');
                        const temp = directionX;
                        directionX = directionZ;
                        directionZ = -temp;
                    }
                    continue; // 回転だけして次のステップへ
                }
            }

            // 前方のブロックをチェック
            const nextX = currentX + directionX;
            const nextZ = currentZ + directionZ;

            const blockAtNext = blocks.find(b =>
                Math.abs(b.x - nextX) < 0.5 &&
                Math.abs(b.z - nextZ) < 0.5
            );

            // 高さの差をチェック
            if (blockAtNext && blockAtNext.y > currentY) {
                // 高いブロックがある場合はジャンプ
                plan.push('JUMP');
                currentY = blockAtNext.y;
            }

            // 前進
            plan.push('MOVE_FORWARD');
            currentX = nextX;
            currentZ = nextZ;

            // ブロックがある場合、その高さに更新
            if (blockAtNext) {
                currentY = blockAtNext.y;
            }
        }

        // 最後に上昇が必要な場合はジャンプを追加
        if (goal.y > currentY) {
            for (let i = 0; i < 3; i++) {
                plan.push('JUMP');
                plan.push('MOVE_FORWARD');
            }
        }

        console.log('Generated plan:', plan);
        return plan;
    }

    /**
     * ゲーム更新（毎フレーム呼ばれる）
     */
    update(deltaTime) {
        // レベルのアニメーション更新
        this.levelGenerator.update();

        if (this.gameState !== 'running' || !this.agent) {
            return;
        }

        // タイマー更新
        this.timeRemaining -= deltaTime;
        this.updateUI();

        // 時間切れチェック
        if (this.timeRemaining <= 0) {
            this.gameOver('TIME UP!');
            return;
        }

        // プランに従ってアクション実行（60フレームごとに1アクション）
        if (Math.floor(Date.now() / 1000) % 1 === 0 && this.currentStep < this.plan.length) {
            this.executeAction(this.plan[this.currentStep]);
            this.currentStep++;
        }

        // エージェントの物理演算更新
        const status = this.agent.update(this.levelGenerator.blocks);

        // 落下判定
        if (status === 'fell') {
            this.gameOver('FELL DOWN!');
            return;
        }

        // ゴール判定
        if (this.agent.checkGoal(this.levelGenerator.goalPosition)) {
            this.gameSuccess();
        }
    }

    /**
     * アクションを実行
     */
    executeAction(action) {
        if (!this.agent) return;

        switch(action) {
            case 'MOVE_FORWARD':
                this.agent.moveForward();
                break;
            case 'TURN_RIGHT':
                this.agent.turn('right');
                break;
            case 'TURN_LEFT':
                this.agent.turn('left');
                break;
            case 'JUMP':
                this.agent.jump();
                break;
        }
    }

    /**
     * ゲーム成功
     */
    gameSuccess() {
        this.gameState = 'success';
        this.score += Math.floor(this.timeRemaining * 100);
        this.showStatus('COURSE CLEAR!');

        // 勝利ポーズ
        const victoryInterval = setInterval(() => {
            if (this.agent) {
                this.agent.victoryPose();
            }
        }, 100);

        setTimeout(() => {
            clearInterval(victoryInterval);
        }, 2000);
    }

    /**
     * ゲームオーバー
     */
    gameOver(message) {
        this.gameState = 'failed';
        this.showStatus(message);

        // やられモーション
        if (this.agent) {
            const dieInterval = setInterval(() => {
                this.agent.die();
            }, 50);

            setTimeout(() => {
                clearInterval(dieInterval);
            }, 1000);
        }
    }

    /**
     * UI更新
     */
    updateUI() {
        this.timeDisplay.textContent = `TIME: ${Math.ceil(this.timeRemaining)}`;
        this.scoreDisplay.textContent = `SCORE: ${this.score}`;
    }

    /**
     * ステータス表示
     */
    showStatus(message) {
        this.statusDisplay.textContent = message;
        this.statusDisplay.style.display = 'block';
    }

    /**
     * ステータス非表示
     */
    hideStatus() {
        this.statusDisplay.style.display = 'none';
    }

    /**
     * リセット
     */
    reset() {
        this.gameState = 'idle';
        this.currentStep = 0;
        this.plan = [];
        this.timeRemaining = 30;
        this.score = 0;

        if (this.agent) {
            this.agent.remove();
            this.agent = null;
        }

        this.levelGenerator.clear();
        this.hideStatus();
        this.loadingDisplay.style.display = 'none';
        this.updateUI();
    }
}
