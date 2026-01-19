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
        this.actionTimer = 0; // アクション実行用のタイマー
        this.actionInterval = 0.5; // アクション実行間隔（秒）
        this.levelData = null; // 生成されたレベルデータ

        // UI要素への参照
        this.timeDisplay = document.getElementById('time-display');
        this.scoreDisplay = document.getElementById('score-display');
        this.statusDisplay = document.getElementById('status-display');
        this.loadingDisplay = document.getElementById('loading');
    }

    /**
     * コースを生成（ゲーム開始前）
     */
    generateCourse(difficulty = 'easy') {
        // 既存のコースとエージェントをクリア
        if (this.agent) {
            this.agent.remove();
            this.agent = null;
        }
        this.levelGenerator.clear();

        // 新しいコースを生成
        this.levelData = this.levelGenerator.generate(difficulty);

        // エージェントを配置（表示のみ、まだ動かさない）
        this.agent = new PlumberAgent(this.scene, this.levelData.start);

        console.log('Course generated:', this.levelData);
    }

    /**
     * ゲーム開始
     */
    async startGame(config = null) {
        this.openaiConfig = config;
        this.gameState = 'planning';
        this.timeRemaining = 30;
        this.score = 0;
        this.currentStep = 0;
        this.actionTimer = 0;

        // 生成済みのコースを使用
        if (!this.levelData) {
            console.error('No course generated! Call generateCourse() first.');
            return;
        }

        const levelData = this.levelData;

        // エージェントをスタート位置に再配置
        if (this.agent) {
            this.agent.remove();
        }
        this.agent = new PlumberAgent(this.scene, levelData.start);

        // AIプランニング
        if (config && config.apiKey) {
            this.showStatus('AI PLANNING...');
            this.loadingDisplay.style.display = 'block';

            try {
                this.plan = await this.getPlanFromAI(levelData);
                console.log('Plan received:', this.plan);

                this.loadingDisplay.style.display = 'none';
                this.showStatus('OPENAI MODE');
                setTimeout(() => this.hideStatus(), 1000);

                this.gameState = 'running';
            } catch (error) {
                console.error('Planning failed:', error);
                this.loadingDisplay.style.display = 'none';
                this.showStatus('AI FAILED - DEMO MODE');
                setTimeout(() => this.hideStatus(), 2000);

                // APIが使えない場合、マップを考慮したデモプランを生成
                this.plan = this.generateSimplePath(levelData);
                this.gameState = 'running';
            }
        } else {
            // デモモード
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
        // APIキーがない場合はエラー
        if (!this.openaiConfig || !this.openaiConfig.apiKey) {
            throw new Error('No API key provided');
        }

        const prompt = this.createPrompt(levelData);

        // エンドポイントURLを構築
        const baseURL = this.openaiConfig.baseURL || 'https://api.openai.com/v1';
        const endpoint = `${baseURL}/chat/completions`;

        // リクエストヘッダーを構築
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.openaiConfig.apiKey}`
        };

        // プロキシ用のカスタムヘッダー（存在する場合のみ追加）
        if (this.openaiConfig.userId) {
            headers['X-User-Id'] = this.openaiConfig.userId;
        }
        if (this.openaiConfig.appTitle) {
            headers['X-Title'] = this.openaiConfig.appTitle;
        }

        // デバッグ情報をログ出力
        console.log('OpenAI API Request:', {
            endpoint: endpoint,
            model: 'gpt-4o',
            hasApiKey: !!this.openaiConfig.apiKey,
            headers: Object.keys(headers)
        });

        // OpenAI API呼び出し
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                model: 'gpt-4o',
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
                max_tokens: 1000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Details:', {
                status: response.status,
                statusText: response.statusText,
                errorBody: errorText
            });
            throw new Error(`API request failed: ${response.status} ${errorText}`);
        }

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
        prompt += '- ジャンプ最大距離 = 1.0ブロック（斜めは約1.4ブロック）\n';
        prompt += '- 移動速度 = グリッドベース（1ブロック単位で移動）\n';
        prompt += '- コースは複雑な経路（横移動、段差、斜め配置あり）\n\n';
        prompt += '利用可能なアクション:\n';
        prompt += '- MOVE_FORWARD: 前進（同じ高さまたは下段差）\n';
        prompt += '- TURN_RIGHT: 右に90度回転\n';
        prompt += '- TURN_LEFT: 左に90度回転\n';
        prompt += '- JUMP_FORWARD: ジャンプしながら前進（穴や上段差を飛び越える）\n';
        prompt += '- JUMP_DIAGONAL_LEFT: 左斜め前にジャンプ（横移動が必要な場合）\n';
        prompt += '- JUMP_DIAGONAL_RIGHT: 右斜め前にジャンプ（横移動が必要な場合）\n\n';
        prompt += '以下のJSON形式で行動計画を返してください:\n';
        prompt += '{\n';
        prompt += '  "plan": ["MOVE_FORWARD", "JUMP_FORWARD", "JUMP_DIAGONAL_LEFT", "TURN_RIGHT", ...]\n';
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

            // 現在向いている方向の前方ブロックをチェック（1〜3ブロック先まで）
            const nextX = currentX + directionX;
            const nextZ = currentZ + directionZ;

            // 1ブロック先をチェック（判定範囲を広めに）
            const blockAt1 = blocks.find(b =>
                Math.abs(b.x - nextX) < 0.6 &&
                Math.abs(b.z - nextZ) < 0.6
            );

            if (blockAt1) {
                // 1ブロック先にブロックがある
                const heightDiff = blockAt1.y - currentY;

                if (heightDiff > 0.5) {
                    // 明らかに高いブロック（0.5以上）：ジャンプして登る
                    plan.push('JUMP_FORWARD');
                    currentX = blockAt1.x;
                    currentZ = blockAt1.z;
                    currentY = blockAt1.y;
                } else if (heightDiff < -0.5) {
                    // 明らかに低いブロック：そのまま歩いて降りる
                    plan.push('MOVE_FORWARD');
                    currentX = blockAt1.x;
                    currentZ = blockAt1.z;
                    currentY = blockAt1.y;
                } else {
                    // ほぼ同じ高さ（-0.5〜0.5）：普通に歩く
                    plan.push('MOVE_FORWARD');
                    currentX = blockAt1.x;
                    currentZ = blockAt1.z;
                    currentY = blockAt1.y;
                }
            } else {
                // 1ブロック先が穴：2ブロック先（1マス分の穴）をチェック
                const blockAt2 = blocks.find(b =>
                    Math.abs(b.x - (currentX + directionX * 2)) < 0.6 &&
                    Math.abs(b.z - (currentZ + directionZ * 2)) < 0.6
                );

                if (blockAt2) {
                    // 2ブロック先に着地点がある：1ブロック分の穴をジャンプ
                    plan.push('JUMP_FORWARD');
                    currentX = blockAt2.x;
                    currentZ = blockAt2.z;
                    currentY = blockAt2.y;
                } else {
                    // 2ブロック先もない：斜め方向をチェック
                    const leftDirX = -directionZ;
                    const leftDirZ = directionX;
                    const rightDirX = directionZ;
                    const rightDirZ = -directionX;

                    // 左斜め前をチェック（前1+左1, 前1+左2, 前2+左1）
                    let diagonalLeft = null;
                    for (let f = 1; f <= 2; f++) {
                        for (let s = 1; s <= 2; s++) {
                            const checkX = currentX + directionX * f + leftDirX * s;
                            const checkZ = currentZ + directionZ * f + leftDirZ * s;
                            const found = blocks.find(b =>
                                Math.abs(b.x - checkX) < 0.6 &&
                                Math.abs(b.z - checkZ) < 0.6
                            );
                            if (found) {
                                diagonalLeft = found;
                                break;
                            }
                        }
                        if (diagonalLeft) break;
                    }

                    // 右斜め前をチェック
                    let diagonalRight = null;
                    for (let f = 1; f <= 2; f++) {
                        for (let s = 1; s <= 2; s++) {
                            const checkX = currentX + directionX * f + rightDirX * s;
                            const checkZ = currentZ + directionZ * f + rightDirZ * s;
                            const found = blocks.find(b =>
                                Math.abs(b.x - checkX) < 0.6 &&
                                Math.abs(b.z - checkZ) < 0.6
                            );
                            if (found) {
                                diagonalRight = found;
                                break;
                            }
                        }
                        if (diagonalRight) break;
                    }

                    // ゴールに近い方の斜めジャンプを選択
                    const goalDeltaX = goal.x - currentX;
                    const goalDeltaZ = goal.z - currentZ;

                    if (diagonalLeft && diagonalRight) {
                        // 両方ある場合はゴールに近い方を選択
                        const distLeft = Math.abs(diagonalLeft.x - goal.x) + Math.abs(diagonalLeft.z - goal.z);
                        const distRight = Math.abs(diagonalRight.x - goal.x) + Math.abs(diagonalRight.z - goal.z);

                        if (distLeft < distRight) {
                            plan.push('JUMP_DIAGONAL_LEFT');
                            currentX = diagonalLeft.x;
                            currentZ = diagonalLeft.z;
                            currentY = diagonalLeft.y;
                        } else {
                            plan.push('JUMP_DIAGONAL_RIGHT');
                            currentX = diagonalRight.x;
                            currentZ = diagonalRight.z;
                            currentY = diagonalRight.y;
                        }
                    } else if (diagonalLeft) {
                        plan.push('JUMP_DIAGONAL_LEFT');
                        currentX = diagonalLeft.x;
                        currentZ = diagonalLeft.z;
                        currentY = diagonalLeft.y;
                    } else if (diagonalRight) {
                        plan.push('JUMP_DIAGONAL_RIGHT');
                        currentX = diagonalRight.x;
                        currentZ = diagonalRight.z;
                        currentY = diagonalRight.y;
                    } else {
                        // 斜めもない：方向転換
                        if (Math.abs(goalDeltaX) > 0.5) {
                            plan.push('TURN_RIGHT');
                            const temp = directionX;
                            directionX = directionZ;
                            directionZ = -temp;
                        } else if (Math.abs(goalDeltaZ) > 0.5) {
                            plan.push('TURN_RIGHT');
                            const temp = directionX;
                            directionX = directionZ;
                            directionZ = -temp;
                        } else {
                            // ゴールに十分近い：右に回転
                            plan.push('TURN_RIGHT');
                            const temp = directionX;
                            directionX = directionZ;
                            directionZ = -temp;
                        }
                    }
                }
            }
        }

        // 最後に上昇が必要な場合はジャンプを追加
        if (goal.y > currentY) {
            for (let i = 0; i < 3; i++) {
                plan.push('JUMP_FORWARD');
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

        // プランに従ってアクション実行（移動完了後に次のアクション）
        if (!this.agent.isMoving && this.currentStep < this.plan.length) {
            this.actionTimer += deltaTime;
            if (this.actionTimer >= this.actionInterval) {
                this.executeAction(this.plan[this.currentStep]);
                this.currentStep++;
                this.actionTimer = 0; // タイマーをリセット
            }
        }

        // エージェントのグリッドベース移動更新
        const status = this.agent.update(this.levelGenerator.blocks, deltaTime);

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

        const blocks = this.levelGenerator.blocks;
        const agentPos = this.agent.position;
        const agentDir = this.agent.direction;

        switch(action) {
            case 'MOVE_FORWARD':
            case 'JUMP_FORWARD':
                // 次のブロックを検索（1〜3ブロック先）
                let targetBlock = null;

                for (let dist = 1; dist <= 3; dist++) {
                    const checkX = agentPos.x + agentDir.x * dist;
                    const checkZ = agentPos.z + agentDir.z * dist;

                    const foundBlock = blocks.find(b =>
                        Math.abs(b.x - checkX) < 0.6 &&
                        Math.abs(b.z - checkZ) < 0.6
                    );

                    if (foundBlock) {
                        targetBlock = foundBlock;
                        break;
                    }
                }

                if (targetBlock) {
                    if (action === 'MOVE_FORWARD') {
                        this.agent.moveForward(targetBlock);
                    } else {
                        this.agent.jumpForward(targetBlock);
                    }
                }
                break;
            case 'JUMP_DIAGONAL_LEFT':
            case 'JUMP_DIAGONAL_RIGHT':
                // 斜め方向のブロックを検索
                let diagonalBlock = null;

                // 左右方向のベクトルを計算
                const leftDir = { x: -agentDir.z, z: agentDir.x };  // 左方向
                const rightDir = { x: agentDir.z, z: -agentDir.x }; // 右方向
                const sideDir = action === 'JUMP_DIAGONAL_LEFT' ? leftDir : rightDir;

                // 斜め方向（前方1 + 左右1）をチェック
                for (let forward = 1; forward <= 2; forward++) {
                    for (let side = 1; side <= 2; side++) {
                        const checkX = agentPos.x + agentDir.x * forward + sideDir.x * side;
                        const checkZ = agentPos.z + agentDir.z * forward + sideDir.z * side;

                        const foundBlock = blocks.find(b =>
                            Math.abs(b.x - checkX) < 0.6 &&
                            Math.abs(b.z - checkZ) < 0.6
                        );

                        if (foundBlock) {
                            diagonalBlock = foundBlock;
                            break;
                        }
                    }
                    if (diagonalBlock) break;
                }

                if (diagonalBlock) {
                    if (action === 'JUMP_DIAGONAL_LEFT') {
                        this.agent.jumpDiagonalLeft(diagonalBlock);
                    } else {
                        this.agent.jumpDiagonalRight(diagonalBlock);
                    }
                }
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
        this.actionTimer = 0;
        this.levelData = null;

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
