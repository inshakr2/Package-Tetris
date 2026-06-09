# Windows CMD 자동 실행 가이드

이 문서는 Windows 사용자가 PowerShell 명령어를 직접 입력하지 않고 Package Tetris를 실행할 수 있도록 안내한다.

## 결론

Windows에서는 `.exe` 파일을 새로 만들지 않는다. 실행 파일처럼 보이더라도 .exe로 저장하지 않는다. 메모장으로 만들 때도 확장자는 `.cmd` 또는 `.bat`를 사용한다.

Package Tetris에는 이미 아래 자동 실행 파일이 포함되어 있다.

```text
scripts/windows-start-package-tetris.cmd
```

이 파일은 Windows 명령 프롬프트에서 `npm.cmd`를 실행하므로 PowerShell의 `npm.ps1` 실행 정책 오류를 피할 수 있다.

## 사용 방법

1. Node.js LTS를 설치한다.
2. GitHub에서 Package Tetris ZIP 파일을 내려받고 압축을 푼다.
3. 압축을 푼 폴더 안의 `scripts` 폴더를 연다.
4. `windows-start-package-tetris.cmd` 파일을 더블클릭한다.
5. 처음 실행하면 필요한 파일을 자동으로 설치한다.
6. 현장 audit이 통과하면 개발 서버가 실행된다.
7. 브라우저에서 터미널에 표시된 `http://localhost:3000` 주소를 연다.

## 자동 실행 파일이 하는 일

`windows-start-package-tetris.cmd`는 아래 순서로 동작한다.

1. 프로젝트 루트 폴더로 이동한다.
2. Node.js와 npm 설치 여부를 확인한다.
3. `node_modules` 폴더가 없으면 `npm.cmd install`을 실행한다.
4. `npm.cmd run field:audit`으로 현장형 시나리오를 확인한다.
5. `npm.cmd run dev`로 앱을 실행한다.

## 직접 cmd 파일을 만들어야 하는 경우

기존 파일을 사용할 수 없다면 메모장을 열고 아래 내용을 붙여넣는다.

```cmd
@echo off
setlocal
cd /d "%~dp0"
if exist package.json goto run
if exist ..\package.json cd /d ..
:run
if not exist package.json (
  echo Package Tetris project folder was not found.
  pause
  exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js LTS is not installed.
  pause
  exit /b 1
)
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo npm.cmd was not found. Reinstall Node.js LTS.
  pause
  exit /b 1
)
if not exist node_modules (
  call npm.cmd install
  if errorlevel 1 pause & exit /b 1
)
call npm.cmd run field:audit
if errorlevel 1 pause & exit /b 1
call npm.cmd run dev
pause
```

저장할 때는 아래처럼 저장한다.

- 파일 이름: `windows-start-package-tetris.cmd`
- 파일 형식: `모든 파일`
- 인코딩: 기본값 그대로 사용

파일 이름이 `windows-start-package-tetris.cmd.txt`로 저장되면 실행되지 않는다. 파일 탐색기에서 확장자 표시를 켠 뒤 `.txt`를 지운다.

## 참고 기준

- Microsoft Windows commands 문서: https://learn.microsoft.com/windows-server/administration/windows-commands/windows-commands
- Microsoft `cmd` 문서: https://learn.microsoft.com/windows-server/administration/windows-commands/cmd
- PowerShell 실행 정책 문제는 [about_Execution_Policies](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_execution_policies)를 참고한다.
