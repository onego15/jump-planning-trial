import * as THREE from 'three';
import { GameManager } from './GameManager.js';

/**
 * メインアプリケーション
 */
class Game {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.gameManager = null;
        this.clock = new THREE.Clock();

        this.init();
        this.setupEventListeners();
        this.animate();
    }

    /**
     * 初期化
     */
    init() {
        // シーンの作成
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xFFE4B5); // 渓谷の空（薄いオレンジ）

        // カメラの作成
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(-5, 8, -8);
        this.camera.lookAt(0, 2, 5);

        // レンダラーの作成
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        const container = document.getElementById('game-container');
        container.insertBefore(this.renderer.domElement, container.firstChild);

        // ライティング
        this.setupLighting();

        // 背景（雲とスカイボックス）
        this.setupBackground();

        // GameManagerの作成
        this.gameManager = new GameManager(this.scene);

        // ウィンドウリサイズ対応
        window.addEventListener('resize', () => this.onWindowResize());

        // ローディング非表示
        document.getElementById('loading').style.display = 'none';
    }

    /**
     * ライティングのセットアップ
     */
    setupLighting() {
        // 環境光（全体を明るく）
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // ディレクショナルライト（太陽光）
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 15, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -15;
        directionalLight.shadow.camera.right = 15;
        directionalLight.shadow.camera.top = 15;
        directionalLight.shadow.camera.bottom = -15;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // ハイライト用のポイントライト
        const pointLight = new THREE.PointLight(0xffff00, 0.5, 20);
        pointLight.position.set(0, 10, 0);
        this.scene.add(pointLight);
    }

    /**
     * 背景のセットアップ（渓谷・山岳地帯）
     */
    setupBackground() {
        // 遠くの山々を追加（レイヤー状に配置）
        const mountainLayers = [
            { color: 0x8B7355, distance: 50, height: 30, count: 5 },   // 一番遠い山（茶色）
            { color: 0xA0826D, distance: 40, height: 25, count: 4 },   // 中間の山
            { color: 0xB8956F, distance: 30, height: 20, count: 3 }    // 手前の山
        ];

        mountainLayers.forEach(layer => {
            for (let i = 0; i < layer.count; i++) {
                const mountainGeometry = new THREE.ConeGeometry(
                    8 + Math.random() * 4,  // 底面半径
                    layer.height,           // 高さ
                    4                       // セグメント（角錐っぽく）
                );
                const mountainMaterial = new THREE.MeshToonMaterial({
                    color: layer.color,
                    flatShading: true
                });

                const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
                mountain.position.set(
                    (i - layer.count / 2) * 20 + Math.random() * 10,  // X位置（左右に配置）
                    layer.height / 2 - 25,                             // Y位置（下に配置）
                    layer.distance + Math.random() * 5                 // Z位置（奥行き）
                );
                mountain.rotation.y = Math.random() * Math.PI * 2;
                this.scene.add(mountain);
            }
        });

        // 渓谷の底（遠く下方）
        const canyonFloorGeometry = new THREE.PlaneGeometry(200, 200);
        const canyonFloorMaterial = new THREE.MeshToonMaterial({
            color: 0x654321,  // 暗い茶色
            side: THREE.DoubleSide
        });
        const canyonFloor = new THREE.Mesh(canyonFloorGeometry, canyonFloorMaterial);
        canyonFloor.rotation.x = -Math.PI / 2;
        canyonFloor.position.y = -30;
        this.scene.add(canyonFloor);

        // 岩の壁（側面）
        for (let side of [-1, 1]) {
            const wallGeometry = new THREE.PlaneGeometry(100, 60);
            const wallMaterial = new THREE.MeshToonMaterial({
                color: 0x8B6F47,  // 岩の色
                side: THREE.DoubleSide
            });
            const wall = new THREE.Mesh(wallGeometry, wallMaterial);
            wall.position.set(side * 25, 0, 10);
            wall.rotation.y = side * Math.PI / 2;
            this.scene.add(wall);

            // 岩の凹凸を追加（球体で表現）
            for (let i = 0; i < 8; i++) {
                const rockGeometry = new THREE.SphereGeometry(
                    2 + Math.random() * 3,
                    6, 6
                );
                const rockMaterial = new THREE.MeshToonMaterial({
                    color: 0x6B5A3D
                });
                const rock = new THREE.Mesh(rockGeometry, rockMaterial);
                rock.position.set(
                    side * 25 + side * Math.random() * 2,
                    Math.random() * 40 - 20,
                    Math.random() * 40
                );
                rock.scale.set(
                    1 + Math.random(),
                    1 + Math.random(),
                    0.5
                );
                this.scene.add(rock);
            }
        }

        // 霧の効果（遠くをぼかす）
        this.scene.fog = new THREE.Fog(0xFFE4B5, 20, 60);
    }

    /**
     * イベントリスナーのセットアップ
     */
    setupEventListeners() {
        const easyBtn = document.getElementById('easy-btn');
        const hardBtn = document.getElementById('hard-btn');
        const generateBtn = document.getElementById('generate-btn');
        const demoBtn = document.getElementById('demo-btn');
        const openaiBtn = document.getElementById('openai-btn');
        const resetBtn = document.getElementById('reset-btn');

        // 難易度の状態
        let selectedDifficulty = 'easy';
        let courseGenerated = false;

        // 環境変数からOpenAI設定を読み込み
        const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
        const openaiBaseUrl = import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1';
        const openaiUserId = import.meta.env.VITE_OPENAI_USER_ID;
        const openaiAppTitle = import.meta.env.VITE_OPENAI_APP_TITLE;

        // OpenAI APIキーがある場合のみOpenAIボタンを表示
        if (openaiApiKey && openaiApiKey.trim() !== '') {
            openaiBtn.style.display = 'inline-block';
        }

        // EASYボタン
        easyBtn.addEventListener('click', () => {
            selectedDifficulty = 'easy';
            easyBtn.classList.add('selected');
            hardBtn.classList.remove('selected');
        });

        // HARDボタン
        hardBtn.addEventListener('click', () => {
            selectedDifficulty = 'hard';
            hardBtn.classList.add('selected');
            easyBtn.classList.remove('selected');
        });

        // GENERATE COURSEボタン
        generateBtn.addEventListener('click', () => {
            // コースのみ生成
            this.gameManager.generateCourse(selectedDifficulty);
            courseGenerated = true;

            // ゲームボタンを有効化
            demoBtn.disabled = false;
            openaiBtn.disabled = false;
        });

        // DEMO MODEボタン
        demoBtn.addEventListener('click', () => {
            if (!courseGenerated) return;
            // デモモードで実行（APIキーなし）
            this.gameManager.startGame(null);
        });

        // OPENAI MODEボタン
        openaiBtn.addEventListener('click', () => {
            if (!courseGenerated) return;
            // OpenAIモードで実行
            const config = {
                apiKey: openaiApiKey,
                baseURL: openaiBaseUrl,
                userId: openaiUserId,
                appTitle: openaiAppTitle
            };
            this.gameManager.startGame(config);
        });

        // RESETボタン
        resetBtn.addEventListener('click', () => {
            this.gameManager.reset();
            courseGenerated = false;
            demoBtn.disabled = true;
            openaiBtn.disabled = true;
            generateBtn.disabled = false;
        });
    }

    /**
     * ウィンドウリサイズ処理
     */
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * アニメーションループ
     */
    animate() {
        requestAnimationFrame(() => this.animate());

        const deltaTime = this.clock.getDelta();

        // GameManagerの更新
        if (this.gameManager) {
            this.gameManager.update(deltaTime);
        }

        // カメラをキャラクターに追従（エージェントがいる場合）
        if (this.gameManager.agent) {
            const agentPos = this.gameManager.agent.getPosition();
            this.camera.position.x = agentPos.x - 5;
            this.camera.position.y = agentPos.y + 8;
            this.camera.position.z = agentPos.z - 8;
            this.camera.lookAt(agentPos.x, agentPos.y, agentPos.z + 3);
        }

        // レンダリング
        this.renderer.render(this.scene, this.camera);
    }
}

// アプリケーション起動
new Game();
