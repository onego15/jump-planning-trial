import * as THREE from 'three';

/**
 * PlumberAgent - マリオ風のAIキャラクター
 */
export class PlumberAgent {
    constructor(scene, startPosition) {
        this.scene = scene;
        this.position = new THREE.Vector3(
            startPosition.x,
            startPosition.y + 1, // Y軸が上下
            startPosition.z
        );
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.direction = new THREE.Vector3(0, 0, 1); // 初期方向は+Z（前方）
        this.isJumping = false;
        this.isGrounded = false;

        // グリッドベースの移動
        this.targetPosition = null;
        this.moveProgress = 0;
        this.isMoving = false;
        this.moveSpeed = 3.0; // 移動速度（1秒で3ブロック）
        this.jumpHeight = 0.8; // ジャンプの高さ

        // 物理パラメータ（着地判定用）
        this.gravity = -0.03;
        this.maxJumpHeight = 1.5;
        this.maxJumpDistance = 1.0;

        this.createCharacter();
    }

    /**
     * キャラクターのメッシュを作成（2-3頭身のシンプルなヒューマノイド）
     */
    createCharacter() {
        this.character = new THREE.Group();

        // 体（青いオーバーオール）
        const bodyGeometry = new THREE.BoxGeometry(0.4, 0.5, 0.3);
        const bodyMaterial = new THREE.MeshToonMaterial({ color: 0x0000FF });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.25;

        // エッジを追加
        const bodyEdges = new THREE.EdgesGeometry(bodyGeometry);
        const bodyLine = new THREE.LineSegments(
            bodyEdges,
            new THREE.LineBasicMaterial({ color: 0x000000 })
        );
        body.add(bodyLine);

        // 頭（肌色）
        const headGeometry = new THREE.BoxGeometry(0.35, 0.35, 0.3);
        const headMaterial = new THREE.MeshToonMaterial({ color: 0xFFDDAA });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 0.6;

        const headEdges = new THREE.EdgesGeometry(headGeometry);
        const headLine = new THREE.LineSegments(
            headEdges,
            new THREE.LineBasicMaterial({ color: 0x000000 })
        );
        head.add(headLine);

        // 帽子（赤）
        const hatGeometry = new THREE.BoxGeometry(0.4, 0.15, 0.35);
        const hatMaterial = new THREE.MeshToonMaterial({ color: 0xFF0000 });
        const hat = new THREE.Mesh(hatGeometry, hatMaterial);
        hat.position.y = 0.75;

        const hatEdges = new THREE.EdgesGeometry(hatGeometry);
        const hatLine = new THREE.LineSegments(
            hatEdges,
            new THREE.LineBasicMaterial({ color: 0x000000 })
        );
        hat.add(hatLine);

        // 腕（左右）
        const armGeometry = new THREE.BoxGeometry(0.15, 0.4, 0.15);
        const armMaterial = new THREE.MeshToonMaterial({ color: 0x0000FF });

        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.275, 0.2, 0);

        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.275, 0.2, 0);

        // 脚（左右）
        const legGeometry = new THREE.BoxGeometry(0.15, 0.3, 0.15);
        const legMaterial = new THREE.MeshToonMaterial({ color: 0x8B4513 });

        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.1, -0.15, 0);

        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.1, -0.15, 0);

        this.character.add(body);
        this.character.add(head);
        this.character.add(hat);
        this.character.add(leftArm);
        this.character.add(rightArm);
        this.character.add(leftLeg);
        this.character.add(rightLeg);

        this.character.position.copy(this.position);

        this.scene.add(this.character);
    }

    /**
     * 指定したブロックに向かって移動開始
     */
    moveToBlock(targetBlock, isJump = false) {
        if (this.isMoving) return; // 既に移動中の場合は無視

        this.targetPosition = new THREE.Vector3(
            targetBlock.x,
            targetBlock.y + 1, // キャラクターの足元がブロックの上
            targetBlock.z
        );
        this.startPosition = this.position.clone();
        this.moveProgress = 0;
        this.isMoving = true;
        this.isJumping = isJump;
    }

    /**
     * 前進（次のブロックを指定する必要あり）
     */
    moveForward(targetBlock) {
        this.moveToBlock(targetBlock, false);
    }

    /**
     * 90度回転
     */
    turn(direction = 'right') {
        if (direction === 'right') {
            // 右に90度回転（Y軸周り）
            const temp = this.direction.x;
            this.direction.x = this.direction.z;
            this.direction.z = -temp;
        } else {
            // 左に90度回転（Y軸周り）
            const temp = this.direction.x;
            this.direction.x = -this.direction.z;
            this.direction.z = temp;
        }

        // キャラクターの向きを更新（Y軸周りの回転）
        const angle = Math.atan2(this.direction.x, this.direction.z);
        this.character.rotation.y = angle;
    }

    /**
     * ジャンプ（その場でジャンプ）
     */
    jump() {
        // その場ジャンプは使用しない（グリッドベースでは不要）
    }

    /**
     * ジャンプしながら前進（穴や段差を飛び越える）
     */
    jumpForward(targetBlock) {
        this.moveToBlock(targetBlock, true);
    }

    /**
     * グリッドベースの移動更新
     */
    update(blocks, deltaTime) {
        if (this.isMoving && this.targetPosition) {
            // 移動進捗を更新
            this.moveProgress += deltaTime * this.moveSpeed;

            if (this.moveProgress >= 1.0) {
                // 移動完了：目標位置に正確に配置
                this.position.copy(this.targetPosition);
                this.isMoving = false;
                this.isJumping = false;
                this.isGrounded = true;
                this.moveProgress = 0;
            } else {
                // 補間で移動
                const t = this.moveProgress;
                this.position.x = this.startPosition.x + (this.targetPosition.x - this.startPosition.x) * t;
                this.position.z = this.startPosition.z + (this.targetPosition.z - this.startPosition.z) * t;

                if (this.isJumping) {
                    // 放物線でジャンプ
                    const jumpProgress = Math.sin(t * Math.PI);
                    const baseY = this.startPosition.y + (this.targetPosition.y - this.startPosition.y) * t;
                    this.position.y = baseY + jumpProgress * this.jumpHeight;
                } else {
                    // 直線で移動
                    this.position.y = this.startPosition.y + (this.targetPosition.y - this.startPosition.y) * t;
                }
            }

            // 簡単な歩行アニメーション
            if (!this.isJumping && this.isMoving) {
                this.character.position.copy(this.position);
                this.character.position.y += Math.sin(this.moveProgress * Math.PI * 4) * 0.05;
            } else {
                this.character.position.copy(this.position);
            }
        } else {
            // 移動していない場合は位置を更新
            this.character.position.copy(this.position);
        }

        // 落下判定
        if (this.position.y < -5) {
            return 'fell';
        }

        return 'alive';
    }

    /**
     * ブロックとの衝突判定
     */
    checkCollision(block) {
        const distance = Math.sqrt(
            Math.pow(this.position.x - block.x, 2) +
            Math.pow(this.position.z - block.z, 2)
        );

        // X,Z平面で0.5以内、Y軸で適切な高さにいる
        return distance < 0.5 &&
               this.position.y >= block.y &&
               this.position.y <= block.y + 1.2;
    }

    /**
     * ゴールとの衝突判定
     */
    checkGoal(goalPosition) {
        const distance = Math.sqrt(
            Math.pow(this.position.x - goalPosition.x, 2) +
            Math.pow(this.position.y - goalPosition.y, 2) +
            Math.pow(this.position.z - goalPosition.z, 2)
        );

        return distance < 1.5;
    }

    /**
     * 勝利ポーズ
     */
    victoryPose() {
        // ジャンプして回転
        this.velocity.y = 0.3;
        this.character.rotation.y += 0.1;
    }

    /**
     * やられモーション
     */
    die() {
        // 回転しながら落下
        this.character.rotation.x += 0.1;
        this.character.rotation.y += 0.1;
    }

    /**
     * 位置を取得
     */
    getPosition() {
        return this.position.clone();
    }

    /**
     * キャラクターを削除
     */
    remove() {
        this.scene.remove(this.character);
    }
}
