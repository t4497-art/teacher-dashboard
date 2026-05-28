const { app, BrowserWindow, Menu, screen, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// 1. 전역 예외 처리기 (실행 중 발생한 모든 오류를 팝업으로 사용자에게 명시)
process.on('uncaughtException', (error) => {
  try {
    dialog.showErrorBox(
      '메인 프로세스 치명적 시스템 오류',
      `프로그램 실행 중에 치명적인 오류가 발생했습니다.\n\n오류 내용:\n${error.stack || error.message}`
    );
  } catch (e) {
    console.error('Unhandled exception:', error);
  }
});

let mainWindow = null;

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    x: primaryDisplay.workArea.x,
    y: primaryDisplay.workArea.y,
    frame: false,             // 1. 타이틀바 및 테두리 제거 (Frameless)
    transparent: true,        // 2. 창 자체를 투명하게 설정
    resizable: false,         // 3. 사용자가 크기 조절하지 못하게 고정
    skipTaskbar: true,        // 4. 작업 표시줄 및 Alt+Tab 목록에서 완전히 표시 제외
    hasShadow: false,         // 5. 그림자 제거
    alwaysOnTop: false,       // 6. 바탕화면 레벨 고정
    webPreferences: {
      nodeIntegration: true,  // Webhook IPC require 가동
      contextIsolation: false,
      webSecurity: false,     // ★ 중요: 로컬 file:// 프로토콜에서 Vite의 ES Module(script type="module") 로딩 시 발생하는 CORS 정책 차단 방지
    },
    title: "PC Local Teacher Widget Dashboard",
    backgroundColor: '#00000000', // 투명 배경 알파채널
    show: false
  });

  // OS별 바탕화면 고정 및 보완 설정
  if (process.platform === 'darwin') {
    mainWindow.setWindowLevel('desktop'); 
  } else if (process.platform === 'win32') {
    try {
      mainWindow.setType('toolbar'); // Windows 바탕화면 레이어와 도구 모음 단에 고정
    } catch (err) {
      console.warn('Failed to set window type:', err);
    }
  }

  // 메뉴 완전히 감추기 (Alt 키 눌려도 안 나옴)
  Menu.setApplicationMenu(null);

  // 2. 패키징 빌드 구조 대응 경로 탐색 (dist/index.html 또는 루트 index.html 확인)
  let indexPath = path.join(__dirname, 'dist', 'index.html');
  if (!fs.existsSync(indexPath)) {
    indexPath = path.join(__dirname, 'index.html');
  }

  // 만약 파일조차 존재하지 않는다면 에러 알림
  if (!fs.existsSync(indexPath)) {
    dialog.showErrorBox(
      '리소스 로드 오류',
      `웹 앱 구성 파일(index.html)을 찾을 수 없습니다.\n\n예상 경로:\n1. ${path.join(__dirname, 'dist', 'index.html')}\n2. ${path.join(__dirname, 'index.html')}`
    );
    return;
  }

  // 빌드 및 패키지된 index.html 로드
  mainWindow.loadFile(indexPath).catch((err) => {
    dialog.showErrorBox(
      'HTML 로딩 실패',
      `index.html 파일 로드 중 실패했습니다:\n${err.message}`
    );
  });

  // 3. 창 보이기 처리 최적화 (ready-to-show 이벤트 누락 시를 대비한 백업 타이머 포함)
  let isShown = false;
  const showWindow = () => {
    if (isShown) return;
    isShown = true;
    mainWindow.show();
  };

  // 5. [초기화 타이밍 문제 자가치유 가드]
  // 창의 콘텐츠와 로드가 완벽히 끝난 시점(Loaded 이벤트 단)에 정확한 멀티모니터 좌표 및 DPI스케일을 조회하고
  // mainWindow가 유실되지 않도록 모니터 맞춤형 정밀 배출을 수행합니다.
  mainWindow.webContents.once('did-finish-load', () => {
    try {
      const primaryDisplay = screen.getPrimaryDisplay();
      const { x, y, width, height } = primaryDisplay.workArea;
      mainWindow.setBounds({ x, y, width, height });
      
      // 즉각 최신 모니터 상태 렌더러 측에 통지하여 브라우저 가로세로 동적 초기 정렬 가동
      handleDisplayChangeOrMetricsUpdate();
    } catch (err) {
      console.warn('Initial window loaded boundary matching failed:', err);
    }
  });

  mainWindow.once('ready-to-show', showWindow);
  setTimeout(showWindow, 1500); // 1.5초 후 예비 자동 강제 노출 백업 설정
}

// 렌더러 프로세스에서 마우스가 투명 배경 영역인지, 위젯 내부인지 분별하여 클릭 통과 상태를 동적 업데이트
ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      win.setIgnoreMouseEvents(ignore, options);
    }
  } catch (err) {
    // Fail-safe
  }
});

// 앱 직접 종료 IPC 처리
ipcMain.on('app-quit', () => {
  app.quit();
});

// 멀티 모니터 디스플레이 정보 리스트 요청 처리
ipcMain.on('get-displays', (event) => {
  try {
    const displays = screen.getAllDisplays().map(d => ({
      id: d.id,
      label: d.label || `디스플레이 ${d.id}`,
      bounds: d.bounds,
      workArea: d.workArea,
      isPrimary: d.id === screen.getPrimaryDisplay().id
    }));
    event.reply('get-displays-response', displays);
  } catch (err) {
    event.reply('get-displays-response', []);
  }
});

// 공용 디스플레이 변경 통보 및 이탈 보호 자가치유 함수
function handleDisplayChangeOrMetricsUpdate() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    const displays = screen.getAllDisplays();
    const mappedDisplays = displays.map(d => ({
      id: d.id,
      label: d.label || `디스플레이 ${d.id}`,
      bounds: d.bounds,
      workArea: d.workArea,
      isPrimary: d.id === screen.getPrimaryDisplay().id
    }));
    
    // 렌더러 프로세스에 업데이트된 모니터 목록 송신
    mainWindow.webContents.send('get-displays-response', mappedDisplays);

    // 창이 유효한 화면 내부 영역에 속하는지 체크 (유실 모니터 방지)
    const winBounds = mainWindow.getBounds();
    const isInsideAnyActiveDisplay = displays.some(d => {
      const db = d.bounds;
      const overlapX = Math.max(0, Math.min(winBounds.x + winBounds.width, db.x + db.width) - Math.max(winBounds.x, db.x));
      const overlapY = Math.max(0, Math.min(winBounds.y + winBounds.height, db.y + db.height) - Math.max(winBounds.y, db.y));
      return (overlapX > 80 && overlapY > 80); // 가로세로 오버랩 체크
    });

    // 만약 완전히 유실된 서브모니터 구역이 있다면 주 화면으로 원복 복제
    if (!isInsideAnyActiveDisplay) {
      const primaryDisp = screen.getPrimaryDisplay();
      const { x, y, width, height } = primaryDisp.workArea;
      mainWindow.setBounds({ x, y, width, height });
    }
  } catch (e) {
    console.error('Self-healing display layout failed:', e);
  }
}

// 모니터 화면 이동 처리
ipcMain.on('change-display', (event, displayId) => {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const displays = screen.getAllDisplays();
    const targetDisplay = displays.find(d => String(d.id) === String(displayId)) || screen.getPrimaryDisplay();
    
    // 대상 모니터 크기와 오프셋 전체로 창 이동 및 꽉차게 배치
    const { x, y, width, height } = targetDisplay.workArea;
    mainWindow.setBounds({ x, y, width, height });
    
    // 즉각적인 레이아웃 정산 자가치유 구동
    handleDisplayChangeOrMetricsUpdate();
  } catch (err) {
    // Fail-safe
  }
});

app.whenReady().then(() => {
  createWindow();

  // OS 레벨 디스플레이 플러그인 토글 및 해상도 변경 감지 데몬 구축
  screen.on('display-added', handleDisplayChangeOrMetricsUpdate);
  screen.on('display-removed', handleDisplayChangeOrMetricsUpdate);
  screen.on('display-metrics-changed', handleDisplayChangeOrMetricsUpdate);

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
