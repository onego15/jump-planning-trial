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
    generate() {
        this.blocks = [];

        // スタート地点の土管を配置
        this.createStartPipe();

        // スタート地点のブロック
        this.addBlock(0, 0, 0, 'ground');
        this.addBlock(0, 0, 1, 'ground');

        // パスを生成（スタートからゴールまで）
        this.generatePath();

        // ゴール地点のスターを配置
        this.createGoalStar();

        return {
            blocks: this.blocks,
            start: this.startPosition,
            goal: this.goalPosition
        };
    }

    /**
     * パスを生成（必ず飛び越せる穴のみ）
     */
    generatePath() {
        let currentX = 0;
        let currentY = 0;
        let currentZ = 2;

        const types = ['brick', 'question', 'metal'];

        // まず主要なパスを作成（Z方向に進む）
        for (let i = 0; i < 15; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            this.addBlock(currentX, currentY, currentZ, type);

            // 次の行動を決定（主にZ方向に進む）
            const action = Math.random();

            if (action < 0.7) {
                // 70%: 前進（穴なし）
                currentZ += 1;
            } else if (action < 0.85) {
                // 15%: 1ブロック分の穴のみ
                currentZ += 2;
            } else if (action < 0.95) {
                // 10%: 高さを上げる
                if (currentY < 3) {
                    currentY += 1;
                    currentZ += 1;
                }
            } else {
                // 5%: 横に少し移動
                if (i > 5 && Math.abs(currentX) < 2) {
                    currentX += Math.random() < 0.5 ? 1 : -1;
                }
                currentZ += 1;
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
