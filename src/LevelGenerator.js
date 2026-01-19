import * as THREE from 'three';

/**
 * LevelGenerator - ランダムなマップを生成するクラス
 */
export class LevelGenerator {
    constructor(scene, gridSize = 12) {
        this.scene = scene;
        this.gridSize = gridSize;
        this.blocks = [];
        this.startPosition = { x: 0, y: 0, z: 0 };
        this.goalPosition = null;
        this.blockSize = 1;
    }

    /**
     * マップを生成する
     */
    generate(difficulty = 'easy') {
        // 前のレベルをクリア
        this.clearLevel();

        this.blocks = [];

        // スタート地点の土管を配置
        this.createStartPipe();

        // スタート地点のブロック
        this.addBlock(0, 0, 0, 'ground');
        this.addBlock(0, 0, 1, 'ground');

        // パスを生成（スタートからゴールまで）
        if (difficulty === 'hard') {
            this.generateHardPath();
        } else {
            this.generatePath();
        }

        // ゴール地点のスターを配置
        this.createGoalStar();

        return {
            blocks: this.blocks,
            start: this.startPosition,
            goal: this.goalPosition
        };
    }

    /**
     * レベルをクリア（シーンから全オブジェクトを削除）
     */
    clearLevel() {
        // blocksのメッシュをシーンから削除
        this.blocks.forEach(block => {
            if (block.mesh) {
                this.scene.remove(block.mesh);
                if (block.mesh.geometry) block.mesh.geometry.dispose();
                if (block.mesh.material) block.mesh.material.dispose();
            }
        });

        // スタート土管を削除
        if (this.startPipe) {
            this.scene.remove(this.startPipe);
            this.startPipe.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            this.startPipe = null;
        }

        // ゴールスターを削除
        if (this.goalStar) {
            this.scene.remove(this.goalStar);
            this.goalStar.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            this.goalStar = null;
        }

        this.blocks = [];
    }

    /**
     * パスを生成（必ず飛び越せる穴のみ）
     */
    generatePath() {
        let currentX = 0;
        let currentY = 0;
        let currentZ = 2;

        const types = ['brick', 'question', 'metal'];

        // まず主要なパスを作成（より複雑な経路）
        for (let i = 0; i < 20; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            this.addBlock(currentX, currentY, currentZ, type);

            // 次の行動を決定（複雑な動き）
            const action = Math.random();

            if (action < 0.4) {
                // 40%: 前進（穴なし）
                currentZ += 1;
            } else if (action < 0.55) {
                // 15%: 1ブロック分の穴
                currentZ += 2;
            } else if (action < 0.65) {
                // 10%: 高さを上げる
                if (currentY < 4) {
                    currentY += 1;
                    currentZ += 1;
                }
            } else if (action < 0.75) {
                // 10%: 高さを下げる（下段差）
                if (currentY > 0) {
                    currentY -= 1;
                    currentZ += 1;
                }
            } else if (action < 0.85) {
                // 10%: 左に移動
                if (Math.abs(currentX - 1) < 3) {
                    currentX -= 1;
                    currentZ += 1;
                }
            } else if (action < 0.95) {
                // 10%: 右に移動
                if (Math.abs(currentX + 1) < 3) {
                    currentX += 1;
                    currentZ += 1;
                }
            } else {
                // 5%: 斜め移動（左右 + 前）
                if (Math.abs(currentX) < 3) {
                    currentX += Math.random() < 0.5 ? 1 : -1;
                    currentZ += 2;
                }
            }
        }

        // 最後のブロックを配置
        const finalType = types[Math.floor(Math.random() * types.length)];
        this.addBlock(currentX, currentY, currentZ, finalType);

        // ゴールへの階段を追加
        for (let i = 1; i <= 2; i++) {
            this.addBlock(currentX, currentY + i, currentZ + i, 'brick');
        }

        // ゴール位置を設定
        this.goalPosition = {
            x: currentX,
            y: currentY + 3,
            z: currentZ + 3
        };
    }

    /**
     * ハードモード用パス生成（罠と分岐を含む）
     * グリーディアルゴリズムを騙す構造：
     * - ゴールに近い方向に行き止まりの罠ルート
     * - ゴールから遠い方向に正解ルート
     * ランダム要素で毎回異なるコースを生成
     */
    generateHardPath() {
        const types = ['brick', 'question', 'metal'];

        // ランダムパラメータ
        const branchDistance = Math.floor(Math.random() * 3) + 3; // 3-5ブロック後に分岐
        const trapOnLeft = Math.random() < 0.5; // 罠を左右どちらに配置するか
        const trapLength = Math.floor(Math.random() * 3) + 3; // 罠の長さ 3-5
        const correctPathPattern = Math.floor(Math.random() * 3); // 正解ルートパターン0-2

        // 1. 共通パス：スタートから分岐点まで
        let x = 0, y = 0, z = 2;
        for (let i = 0; i < branchDistance; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            this.addBlock(x, y, z, type);
            z += 1;
        }

        // 2. 分岐点のブロック
        const branchZ = z;
        this.addBlock(x, y, branchZ, 'question');

        // 3. 罠ルートと正解ルートの方向を決定
        const trapSide = trapOnLeft ? -1 : 1;  // -1: 左, 1: 右
        const correctSide = -trapSide;

        // 4. 罠ルート（ゴールに近く見えるが行き止まり）
        let trapX = x + trapSide;
        let trapZ = branchZ + 1;
        let trapY = y;

        for (let i = 0; i < trapLength; i++) {
            this.addBlock(trapX, trapY, trapZ, 'metal');

            // ランダムに曲がる
            if (i < trapLength - 2) {
                if (Math.random() < 0.5) {
                    trapX += trapSide;  // さらに横に
                } else {
                    trapZ += 1;  // 前に進む
                }
            } else {
                trapZ += 1;  // 最後は前に進んで行き止まり感を出す
            }
        }
        // 行き止まりを示すブロック
        this.addBlock(trapX, trapY, trapZ, 'metal');

        // 5. 正解ルート（遠回りだが正解）
        let correctX = x + correctSide;
        let correctZ = branchZ + 1;
        let correctY = y;

        // 正解ルートのパターン
        switch(correctPathPattern) {
            case 0:
                // パターン0: 横に移動してから上昇、前進
                for (let i = 0; i < 3; i++) {
                    this.addBlock(correctX, correctY, correctZ, 'brick');
                    correctX += correctSide;
                }
                correctY += 1;
                this.addBlock(correctX, correctY, correctZ, 'brick');

                for (let i = 0; i < 6; i++) {
                    correctZ += 1;
                    this.addBlock(correctX, correctY, correctZ, 'brick');
                    if (i === 2) correctZ += 1; // 穴
                }
                break;

            case 1:
                // パターン1: ジグザグ進行
                for (let i = 0; i < 4; i++) {
                    this.addBlock(correctX, correctY, correctZ, 'brick');
                    correctZ += 1;
                    if (i % 2 === 0) {
                        correctX += correctSide;
                    }
                }
                correctY += 1;
                for (let i = 0; i < 4; i++) {
                    correctZ += 1;
                    this.addBlock(correctX, correctY, correctZ, 'brick');
                }
                break;

            case 2:
                // パターン2: 高さ変化重視
                this.addBlock(correctX, correctY, correctZ, 'brick');
                correctY += 1;
                correctZ += 1;
                this.addBlock(correctX, correctY, correctZ, 'brick');

                for (let i = 0; i < 3; i++) {
                    correctX += correctSide;
                    this.addBlock(correctX, correctY, correctZ, 'brick');
                }

                for (let i = 0; i < 5; i++) {
                    correctZ += 1;
                    this.addBlock(correctX, correctY, correctZ, 'brick');
                    if (i === 3) {
                        correctY += 1;  // さらに上昇
                    }
                }
                break;
        }

        // 6. ゴールへの最終アプローチ
        // 中央に戻る
        const returnSteps = Math.abs(correctX - x);
        for (let i = 0; i < Math.min(returnSteps, 2); i++) {
            correctX += (x > correctX) ? 1 : -1;
            correctZ += 1;
            this.addBlock(correctX, correctY, correctZ, 'question');
        }

        // ゴールへの階段
        const goalX = correctX;
        const goalY = correctY;
        const goalZ = correctZ + 1;

        for (let i = 1; i <= 2; i++) {
            this.addBlock(goalX, goalY + i, goalZ + i, 'brick');
        }

        // ゴール位置を設定
        this.goalPosition = {
            x: goalX,
            y: goalY + 3,
            z: goalZ + 3
        };
    }

    /**
     * ブロックを追加
     */
    addBlock(x, y, z, type) {
        const geometry = new THREE.BoxGeometry(this.blockSize, this.blockSize, this.blockSize);

        let material;
        switch(type) {
            case 'brick':
                material = new THREE.MeshToonMaterial({ color: 0xA0522D });
                break;
            case 'question':
                material = new THREE.MeshToonMaterial({ color: 0xFFD700 });
                break;
            case 'metal':
                material = new THREE.MeshToonMaterial({ color: 0x808080 });
                break;
            default: // ground
                material = new THREE.MeshToonMaterial({ color: 0x8B4513 });
        }

        const block = new THREE.Mesh(geometry, material);
        block.position.set(x * this.blockSize, y * this.blockSize, z * this.blockSize);

        // エッジを追加（トゥーンシェーディング風）
        const edges = new THREE.EdgesGeometry(geometry);
        const line = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 })
        );
        block.add(line);

        this.scene.add(block);

        this.blocks.push({
            id: this.blocks.length,
            x: x * this.blockSize,
            y: y * this.blockSize,
            z: z * this.blockSize,
            type: type,
            mesh: block
        });
    }

    /**
     * スタート地点の土管を作成
     */
    createStartPipe() {
        const pipeGeometry = new THREE.CylinderGeometry(0.4, 0.4, 1.5, 16);
        const pipeMaterial = new THREE.MeshToonMaterial({ color: 0x00FF00 });
        const pipe = new THREE.Mesh(pipeGeometry, pipeMaterial);

        pipe.position.set(0, 0.75, -1);

        // エッジを追加
        const edges = new THREE.EdgesGeometry(pipeGeometry);
        const line = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0x000000 })
        );
        pipe.add(line);

        this.scene.add(pipe);
        this.startPipe = pipe;
    }

    /**
     * ゴール地点のスターを作成
     */
    createGoalStar() {
        // スターの形状を作成
        const starShape = new THREE.Shape();
        const points = 5;
        const outerRadius = 0.8;
        const innerRadius = 0.4;

        for (let i = 0; i < points * 2; i++) {
            const angle = (i * Math.PI) / points;
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            if (i === 0) {
                starShape.moveTo(x, y);
            } else {
                starShape.lineTo(x, y);
            }
        }
        starShape.closePath();

        const extrudeSettings = {
            depth: 0.3,
            bevelEnabled: true,
            bevelThickness: 0.1,
            bevelSize: 0.1,
            bevelSegments: 3
        };

        const starGeometry = new THREE.ExtrudeGeometry(starShape, extrudeSettings);
        const starMaterial = new THREE.MeshToonMaterial({
            color: 0xFFFF00,
            emissive: 0xFFAA00,
            emissiveIntensity: 0.5
        });

        this.goalStar = new THREE.Mesh(starGeometry, starMaterial);
        this.goalStar.position.set(
            this.goalPosition.x,
            this.goalPosition.y,
            this.goalPosition.z
        );

        // スターを少し傾ける
        this.goalStar.rotation.x = Math.PI / 6;
        this.goalStar.rotation.z = Math.PI / 4;

        // エッジを追加
        const edges = new THREE.EdgesGeometry(starGeometry);
        const line = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0x000000 })
        );
        this.goalStar.add(line);

        this.scene.add(this.goalStar);
    }

    /**
     * スターを回転させる（アニメーションループで呼ぶ）
     */
    update() {
        if (this.goalStar) {
            this.goalStar.rotation.y += 0.02;
        }
    }

    /**
     * マップをクリア
     */
    clear() {
        this.blocks.forEach(block => {
            this.scene.remove(block.mesh);
        });
        this.blocks = [];

        if (this.goalStar) {
            this.scene.remove(this.goalStar);
        }
    }
}
