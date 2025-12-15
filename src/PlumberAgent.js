import * as THREE from 'three';

/**
 * PlumberAgent - マリオ風のAIキャラクター
 */
export class PlumberAgent {
    constructor(scene, startPosition) {
        this.scene = scene;
        this.position = new THREE.Vector3(
            startPosition.x,
            startPosition.y,
            startPosition.z + 1
        );
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.direction = new THREE.Vector3(1, 0, 0); // 初期方向は+X
        this.isJumping = false;
        this.isGrounded = false;

        // 物理パラメータ
        this.gravity = -0.03;
        this.jumpForce = 0.4;
        this.moveSpeed = 0.1;
        this.maxJumpHeight = 1.5;
        this.maxJumpDistance = 2.0;

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
     * 前進
     */
    moveForward() {
        this.velocity.x = this.direction.x * this.moveSpeed;
        this.velocity.y = this.direction.y * this.moveSpeed;
    }

    /**
     * 90度回転
     */
    turn(direction = 'right') {
        if (direction === 'right') {
            // 右に90度回転
            const temp = this.direction.x;
            this.direction.x = -this.direction.y;
            this.direction.y = temp;
        } else {
            // 左に90度回転
            const temp = this.direction.x;
            this.direction.x = this.direction.y;
            this.direction.y = -temp;
        }

        // キャラクターの向きを更新
        const angle = Math.atan2(this.direction.y, this.direction.x);
        this.character.rotation.z = angle;
    }

    /**
     * ジャンプ
     */
    jump() {
        if (!this.isJumping && this.isGrounded) {
            this.velocity.z = this.jumpForce;
            this.isJumping = true;
            this.isGrounded = false;
        }
    }

    /**
     * 物理演算の更新
     */
    update(blocks) {
        // 重力を適用
        this.velocity.z += this.gravity;

        // 位置を更新
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        this.position.z += this.velocity.z;

        // 地面との衝突判定
        this.isGrounded = false;
        for (const block of blocks) {
            if (this.checkCollision(block)) {
                // ブロックの上に着地
                if (this.velocity.z < 0) {
                    this.position.z = block.z + 1;
                    this.velocity.z = 0;
                    this.isJumping = false;
                    this.isGrounded = true;
                }
            }
        }

        // 移動の減速
        this.velocity.x *= 0.85;
        this.velocity.y *= 0.85;

        // キャラクターの位置を更新
        this.character.position.copy(this.position);

        // 簡単なアニメーション（上下に少し揺らす）
        if (this.isGrounded && (Math.abs(this.velocity.x) > 0.01 || Math.abs(this.velocity.y) > 0.01)) {
            this.character.position.z += Math.sin(Date.now() * 0.01) * 0.02;
        }

        // 落下判定
        if (this.position.z < -5) {
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
            Math.pow(this.position.y - block.y, 2)
        );

        // X,Y平面で0.5以内、Z軸で適切な高さにいる
        return distance < 0.5 &&
               this.position.z >= block.z &&
               this.position.z <= block.z + 1.2;
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
        this.velocity.z = 0.3;
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
