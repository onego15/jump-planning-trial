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
        this.scene.background = new THREE.Color(0x87CEEB); // 明るい青空

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
     * 背景のセットアップ
     */
    setupBackground() {
        // 雲を追加
        const cloudGeometry = new THREE.SphereGeometry(1, 8, 8);
        const cloudMaterial = new THREE.MeshToonMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.7
        });

        for (let i = 0; i < 10; i++) {
            const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
            cloud.position.set(
                Math.random() * 30 - 15,
                Math.random() * 5 + 8,
                Math.random() * 30 - 15
            );
            cloud.scale.set(
                Math.random() + 1,
                Math.random() * 0.5 + 0.5,
                Math.random() + 1
            );
            this.scene.add(cloud);
        }

        // 地平線の効果（遠くの山々）
        const horizonGeometry = new THREE.PlaneGeometry(100, 20);
        const horizonMaterial = new THREE.MeshBasicMaterial({
            color: 0x90EE90,
            side: THREE.DoubleSide
        });
        const horizon = new THREE.Mesh(horizonGeometry, horizonMaterial);
        horizon.position.set(0, -5, 30);
        horizon.rotation.x = Math.PI / 2;
        this.scene.add(horizon);
    }

    /**
     * イベントリスナーのセットアップ
     */
    setupEventListeners() {
        const easyBtn = document.getElementById('easy-btn');
        const hardBtn = document.getElementById('hard-btn');
        const demoBtn = document.getElementById('demo-btn');
        const openaiBtn = document.getElementById('openai-btn');
        const resetBtn = document.getElementById('reset-btn');

        // 難易度の状態
        let selectedDifficulty = 'easy';

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

        // DEMO MODEボタン
        demoBtn.addEventListener('click', () => {
            // デモモードで実行（APIキーなし）
            this.gameManager.startGame(null, selectedDifficulty);
        });

        // OPENAI MODEボタン
        openaiBtn.addEventListener('click', () => {
            // OpenAIモードで実行
            const config = {
                apiKey: openaiApiKey,
                baseURL: openaiBaseUrl,
                userId: openaiUserId,
                appTitle: openaiAppTitle
            };
            this.gameManager.startGame(config, selectedDifficulty);
        });

        // RESETボタン
        resetBtn.addEventListener('click', () => {
            this.gameManager.reset();
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
