# 3D 비행 시뮬레이터 프로젝트 계획서 (React 기반)

## 📋 프로젝트 개요
- **프로젝트명**: React 3D 비행 시뮬레이터
- **생성일**: 2025-08-11
- **개발자**: 개발 입문자
- **목표**: React + Three.js 기반 웹 3D 비행 시뮬레이터

## 🛠 기술 스택 (React 기반)

### 1. 프론트엔드 프레임워크
- **React 18**: 컴포넌트 기반 UI 라이브러리
- **React Hooks**: 상태 관리 (useState, useEffect, useRef)
- **JSX**: JavaScript XML 문법
- **ES6+ JavaScript**: 모던 JavaScript 문법

### 2. 3D 그래픽 라이브러리
- **Three.js**: 3D 그래픽 렌더링
- **@react-three/fiber**: React용 Three.js 래퍼
- **@react-three/drei**: Three.js 헬퍼 컴포넌트
- **WebGL**: 하드웨어 가속 3D 그래픽

### 3. 개발 및 테스트 도구
- **Playwright MCP**: 자동화된 브라우저 테스트
- **Vite**: 빠른 개발 서버 (선택사항)
- **브라우저 DevTools**: 디버깅 도구

## 📁 React 컴포넌트 구조

```
src/
├── App.jsx                 # 메인 애플리케이션
├── components/
│   ├── Scene3D.jsx        # Three.js 3D 씬
│   ├── Aircraft.jsx       # 비행기 컴포넌트
│   ├── Terrain.jsx        # 지형 컴포넌트
│   ├── Sky.jsx           # 하늘/배경 컴포넌트
│   ├── Controls.jsx       # 입력 컨트롤
│   └── UI/
│       ├── HUD.jsx        # Head-Up Display
│       ├── Speedometer.jsx # 속도계
│       ├── Altimeter.jsx  # 고도계
│       └── ControlPanel.jsx # 컨트롤 패널
├── hooks/
│   ├── useKeyboard.js     # 키보드 입력 훅
│   ├── usePhysics.js      # 물리 엔진 훅
│   └── useGameState.js    # 게임 상태 훅
├── utils/
│   ├── physics.js         # 물리 계산
│   ├── constants.js       # 게임 상수
│   └── helpers.js         # 유틸리티 함수
└── assets/
    ├── textures/
    └── models/
```

## 🚀 React 개발 단계

### Phase 1: React 기본 설정 (30분)
1. **HTML 기반 React 설정**
   ```html
   <!DOCTYPE html>
   <html>
   <head>
       <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
       <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
       <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
   </head>
   </html>
   ```

2. **Three.js React 통합**
   - React 컴포넌트 내에서 Three.js 초기화
   - useRef로 Canvas 참조 관리
   - useEffect로 생명주기 관리

### Phase 2: 3D 씬 컴포넌트 (45분)
1. **Scene3D 컴포넌트**
   ```jsx
   function Scene3D() {
     const mountRef = useRef(null);
     
     useEffect(() => {
       // Three.js 씬 초기화
       const scene = new THREE.Scene();
       const camera = new THREE.PerspectiveCamera();
       const renderer = new THREE.WebGLRenderer();
       
       // 렌더링 루프
       function animate() {
         requestAnimationFrame(animate);
         renderer.render(scene, camera);
       }
       animate();
     }, []);
     
     return <div ref={mountRef} />;
   }
   ```

### Phase 3: 비행기 컴포넌트 (60분)
1. **Aircraft 컴포넌트**
   - Three.js 메시 생성
   - 비행기 모델링
   - 애니메이션 제어

2. **물리 엔진 훅**
   ```jsx
   function usePhysics(aircraftRef) {
     const [velocity, setVelocity] = useState({ x: 0, y: 0, z: 0 });
     const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });
     
     useEffect(() => {
       // 물리 계산 로직
     }, []);
     
     return { velocity, rotation };
   }
   ```

### Phase 4: 사용자 인터페이스 (45분)
1. **HUD 컴포넌트**
   - 속도, 고도, 방향 표시
   - CSS를 통한 오버레이
   - 실시간 데이터 바인딩

2. **컨트롤 시스템**
   ```jsx
   function useKeyboard() {
     const [keys, setKeys] = useState({});
     
     useEffect(() => {
       const handleKeyDown = (e) => {
         setKeys(prev => ({ ...prev, [e.key]: true }));
       };
       
       window.addEventListener('keydown', handleKeyDown);
       return () => window.removeEventListener('keydown', handleKeyDown);
     }, []);
     
     return keys;
   }
   ```

### Phase 5: Playwright 자동 테스트 (30분)
1. **테스트 스크립트 작성**
   - 페이지 로딩 테스트
   - 키보드 입력 테스트
   - 3D 렌더링 확인
   - 성능 측정

## 🧪 Playwright MCP 테스트 계획

### 1. 기본 기능 테스트
- [ ] 페이지 로딩 확인
- [ ] React 컴포넌트 렌더링 확인
- [ ] Three.js 씬 초기화 확인
- [ ] 키보드 이벤트 반응 확인

### 2. 3D 렌더링 테스트
- [ ] Canvas 요소 존재 확인
- [ ] WebGL 컨텍스트 생성 확인
- [ ] 비행기 모델 렌더링 확인
- [ ] 애니메이션 프레임 확인

### 3. 사용자 인터랙션 테스트
- [ ] WASD 키 입력 시뮬레이션
- [ ] 마우스 시점 이동 테스트
- [ ] UI 버튼 클릭 테스트
- [ ] 상태 변화 확인

## 📊 React 성능 최적화

### 1. 렌더링 최적화
- **React.memo**: 불필요한 리렌더링 방지
- **useMemo**: 계산 결과 캐싱
- **useCallback**: 함수 참조 안정화

### 2. Three.js 최적화
- **requestAnimationFrame**: 부드러운 애니메이션
- **Object pooling**: 메모리 관리
- **LOD**: 거리별 모델 품질 조절

## 🔧 개발 워크플로우

### 1. 개발 순서
1. 기본 React 앱 생성
2. Three.js 통합
3. 컴포넌트별 개발
4. Playwright 테스트 작성
5. 자동 테스트 실행

### 2. 테스트 주도 개발
1. 기능 명세 작성
2. Playwright 테스트 스크립트 작성
3. 테스트 실행 (실패 확인)
4. 기능 구현
5. 테스트 통과 확인

## 🚀 즉시 시작 계획

1. **HTML 파일에 React 설정** (10분)
2. **기본 App 컴포넌트 생성** (10분)
3. **Three.js 씬 통합** (20분)
4. **Playwright 테스트 시작** (20분)

---

**다음 단계**: React 애플리케이션 생성 및 Playwright 테스트 설정
**예상 소요 시간**: 총 2-3시간
**난이도**: ⭐⭐⭐⭐☆ (중상급) - React + Three.js 조합
