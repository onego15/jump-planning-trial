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
     * キャラクターのメッシュを作成（マリオ風2頭身キャラクター）
     */
    createCharacter() {
        this.character = new THREE.Group();

        // === 体（青いオーバーオール） ===
        const bodyGeometry = new THREE.SphereGeometry(0.25, 16, 16);
        bodyGeometry.scale(1, 1.2, 0.9); // 縦長に
        const bodyMaterial = new THREE.MeshToonMaterial({ color: 0x0044FF });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.25;

        // 体のエッジ
        const bodyEdges = new THREE.EdgesGeometry(bodyGeometry);
        const bodyLine = new THREE.LineSegments(
            bodyEdges,
            new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 })
        );
        body.add(bodyLine);

        // === 赤いシャツ（体の上部） ===
        const shirtGeometry = new THREE.SphereGeometry(0.22, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const shirtMaterial = new THREE.MeshToonMaterial({ color: 0xFF0000 });
        const shirt = new THREE.Mesh(shirtGeometry, shirtMaterial);
        shirt.position.y = 0.4;
        shirt.rotation.x = Math.PI;

        // === 頭（肌色の球体） ===
        const headGeometry = new THREE.SphereGeometry(0.22, 16, 16);
        const headMaterial = new THREE.MeshToonMaterial({ color: 0xFFCC99 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 0.65;

        // === 鼻（大きめの球体） ===
        const noseGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const noseMaterial = new THREE.MeshToonMaterial({ color: 0xFFAA77 });
        const nose = new THREE.Mesh(noseGeometry, noseMaterial);
        nose.position.set(0, 0.63, 0.18);

        // === ひげ（黒い楕円形） ===
        const mustacheGeometry = new THREE.SphereGeometry(0.12, 8, 8);
        mustacheGeometry.scale(1.5, 0.3, 0.5);
        const mustacheMaterial = new THREE.MeshToonMaterial({ color: 0x2B1B0A });
        const mustache = new THREE.Mesh(mustacheGeometry, mustacheMaterial);
        mustache.position.set(0, 0.58, 0.15);

        // === 目（白と黒） ===
        const eyeWhiteGeometry = new THREE.SphereGeometry(0.06, 8, 8);
        const eyeWhiteMaterial = new THREE.MeshToonMaterial({ color: 0xFFFFFF });

        const leftEyeWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial);
        leftEyeWhite.position.set(-0.08, 0.68, 0.15);
        leftEyeWhite.scale.set(1, 1.2, 0.5);

        const rightEyeWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial);
        rightEyeWhite.position.set(0.08, 0.68, 0.15);
        rightEyeWhite.scale.set(1, 1.2, 0.5);

        // 瞳
        const pupilGeometry = new THREE.SphereGeometry(0.03, 8, 8);
        const pupilMaterial = new THREE.MeshToonMaterial({ color: 0x000000 });

        const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        leftPupil.position.set(-0.08, 0.68, 0.18);

        const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        rightPupil.position.set(0.08, 0.68, 0.18);

        // === 帽子（赤） ===
        const capGeometry = new THREE.SphereGeometry(0.24, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const capMaterial = new THREE.MeshToonMaterial({ color: 0xFF0000 });
        const cap = new THREE.Mesh(capGeometry, capMaterial);
        cap.position.y = 0.77;
        cap.rotation.x = Math.PI;

        // 帽子のつば
        const peakGeometry = new THREE.CylinderGeometry(0.28, 0.28, 0.05, 16);
        const peakMaterial = new THREE.MeshToonMaterial({ color: 0xCC0000 });
        const peak = new THREE.Mesh(peakGeometry, peakMaterial);
        peak.position.y = 0.75;

        // 帽子のマーク（Mの代わりに白い円）
        const logoGeometry = new THREE.CircleGeometry(0.08, 16);
        const logoMaterial = new THREE.MeshToonMaterial({ color: 0xFFFFFF, side: THREE.DoubleSide });
        const logo = new THREE.Mesh(logoGeometry, logoMaterial);
        logo.position.set(0, 0.8, 0.2);
        logo.rotation.x = -Math.PI / 8;

        // === 腕（青い袖 + 白い手袋） ===
        const armGeometry = new THREE.CapsuleGeometry(0.06, 0.25, 8, 8);
        const armMaterial = new THREE.MeshToonMaterial({ color: 0xFF0000 });

        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.24, 0.3, 0);
        leftArm.rotation.z = Math.PI / 8;

        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.24, 0.3, 0);
        rightArm.rotation.z = -Math.PI / 8;

        // 手袋（白）
        const gloveGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const gloveMaterial = new THREE.MeshToonMaterial({ color: 0xFFFFFF });

        const leftGlove = new THREE.Mesh(gloveGeometry, gloveMaterial);
        leftGlove.position.set(-0.28, 0.12, 0);

        const rightGlove = new THREE.Mesh(gloveGeometry, gloveMaterial);
        rightGlove.position.set(0.28, 0.12, 0);

        // === 脚（青いズボン） ===
        const legGeometry = new THREE.CapsuleGeometry(0.08, 0.22, 8, 8);
        const legMaterial = new THREE.MeshToonMaterial({ color: 0x0044FF });

        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.08, -0.08, 0);

        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.08, -0.08, 0);

        // === 靴（茶色、大きめ） ===
        const shoeGeometry = new THREE.BoxGeometry(0.12, 0.08, 0.18);
        const shoeMaterial = new THREE.MeshToonMaterial({ color: 0x8B4513 });

        const leftShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
        leftShoe.position.set(-0.08, -0.22, 0.03);

        const rightShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
        rightShoe.position.set(0.08, -0.22, 0.03);

        // === 全パーツを追加 ===
        this.character.add(body);
        this.character.add(shirt);
        this.character.add(head);
        this.character.add(nose);
        this.character.add(mustache);
        this.character.add(leftEyeWhite);
        this.character.add(rightEyeWhite);
        this.character.add(leftPupil);
        this.character.add(rightPupil);
        this.character.add(cap);
        this.character.add(peak);
        this.character.add(logo);
        this.character.add(leftArm);
        this.character.add(rightArm);
        this.character.add(leftGlove);
        this.character.add(rightGlove);
        this.character.add(leftLeg);
        this.character.add(rightLeg);
        this.character.add(leftShoe);
        this.character.add(rightShoe);

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
     * 左斜め前にジャンプ
     */
    jumpDiagonalLeft(targetBlock) {
        this.moveToBlock(targetBlock, true);
    }

    /**
     * 右斜め前にジャンプ
     */
    jumpDiagonalRight(targetBlock) {
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
