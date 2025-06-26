/*****************************************
 * 定数
 *****************************************/
// マスの状態
SQUARE_STATUS_IS_OWNED = "01"; // 自分が所有している
SQUARE_STATUS_IS_OTHER = "02"; // 相手が所有している
SQUARE_STATUS_NOT_SELECTED = "09"; // 選択されていない

/*****************************************
 * アプリケーション設定
 *****************************************/
// トースターのオプション設定
toastr.options = {
    tapToDismiss: false,
    timeOut: 0,
    extendedTimeOut: 0,
};

/*****************************************
 * 変数
 *****************************************/
// ターンを示す変数
let isOddTurn = true;
let countdownTimer;
let countdownInProgress = false;  // カウントダウンが進行中かどうかのフラグ

// タイマーの初期値（30秒）
let player1Time = 30;
let player2Time = 30;

// タイマーのID
let player1TimerInterval;
let player2TimerInterval;

/*****************************************
 * イベント
 *****************************************/
$(function () {
    // マス目にイベントを設定する
    $(".square").click(clickSquareEvent);

    // リスタートボタンを押したときのイベント
    $("#btn-initialize").click(initializeEvent);

    // "前の盤面" ボタンがクリックされたときに、盤面をロードする
    $("#btn-reset").click(loadBoard);

    // 盤面を初期化する
    initializeEvent();
});

/**
 * マス目クリックイベント
 */
function clickSquareEvent() {
    let square = $(this);

    // カウントダウン中ならばカウントダウンを終了し、ゲームを開始
    if (countdownInProgress) {
        clearInterval(countdownTimer);
        countdownInProgress = false;
        toastr.remove();  // カウントダウンメッセージを削除
        toastr.info("ゲームスタート!");
        startTimer();
    }

    if (!canSelect(square)) {
        return;
    }

    toastr.remove();

    // 盤面を保存する（changeOwnerの前に保存）
    saveBoard();  // ここで保存する

    // ここから追加: クリックしたマスを強調表示する処理
    // すべてのマスから強調表示を解除
    $(".square").removeClass("highlight");

    // クリックしたマスに強調表示クラスを追加
    square.addClass("highlight");

    changeOwner(square);

    // ゲーム終了のチェック
    if (isGameEnd()) {
        toastEndMessage("ゲーム終了");
        stopTimer(); // ゲーム終了時にタイマー停止
        return;
    }

    // 現在のカウントを取得
    let countBlack = $("[data-owner=black]").length;
    let countWhite = $("[data-owner=white]").length;


    if (isPass()) {
        toastr.remove();
        Swal.fire({
            title: 'パス',
            text: ((isOddTurn ? "黒" : "白") + "には選択できるマスがありません"),
            icon: 'error',
            confirmButtonText: '確認',
            allowOutsideClick: false,
            allowEscapeKey: false
        });
        changeTurn();

        // 次のターンのカウントを表示
        countBlack = $("[data-owner=black]").length;
        countWhite = $("[data-owner=white]").length;

        if (isPass()) {
            toastEndMessage("選択できるマスがなくなりました");
        } else {
            setTimeout(function () {
                toastr.info(`${isOddTurn ? "黒" : "白"}の番<br>現在の状況 <br>黒:${countBlack} <br>白:${countWhite}
                            <br>※ダブルクリックで非表示`);
            }, 1000);
        }
        return;
    }

    // 現在のカウントを表示
    toastr.info(`${isOddTurn ? "黒" : "白"}の番<br>現在の状況 <br>黒:${countBlack} <br>白:${countWhite}
                 <br>※ダブルクリックで非表示`);
}


/**
 * 盤面を保存する関数（ローカルストレージに保存）
 */
function saveBoard() {
    const boardData = [];
    $(".square").each(function() {
        const square = $(this);
        boardData.push({
            owner: square.attr("data-owner"),
            text: square.text(),
            selected: square.hasClass("selected")  // selected クラスの状態を保存
        });
    });

    // 手番とタイマーの状態を追加
    const gameState = {
        board: boardData,
        isOddTurn: isOddTurn,
        player1Time: player1Time,
        player2Time: player2Time
    };

    // ゲーム状態をローカルストレージに保存
    localStorage.setItem('gameState', JSON.stringify(gameState));
    console.log("盤面と状態が保存されました");  // 保存されるか確認するためのログ
}

/**
 * ローカルストレージから盤面を読み込む関数
 */
function loadBoard() {
    // 既存のtoastrメッセージを消去
    toastr.remove();
    $(".square").removeClass("selected");

    const savedGameState = JSON.parse(localStorage.getItem('gameState'));
    if (savedGameState) {
        // ローカルストレージに保存された盤面があれば、それを反映
        $(".square").each(function(index) {
            const square = $(this);
            const boardData = savedGameState.board[index];
            if (boardData) {
                square.text(boardData.text)
                    .attr("data-owner", boardData.owner);

                // selectedクラスの状態を復元
                if (boardData.selected) {
                    square.addClass("selected");
                } else {
                    square.removeClass("selected");
                }
            }
        });

        // 手番とタイマーの状態を復元
        isOddTurn = savedGameState.isOddTurn;
        player1Time = savedGameState.player1Time;
        player2Time = savedGameState.player2Time;

        // タイマーの表示を更新
        updateTimerDisplay();

        // 盤面がロードされた後に番手と現在の状況を表示
        let countBlack = $("[data-owner=black]").length;
        let countWhite = $("[data-owner=white]").length;

        toastr.info(`${isOddTurn ? "黒" : "白"}の番<br>現在の状況 <br>黒:${countBlack} <br>白:${countWhite}<br>※ダブルクリックで非表示`);

        console.log("盤面と状態がロードされました");  // ロードされていることを確認

        startTimer();

        // 選択可否を設定する
        for (let elem of $(".square")) {
            if (canSelect($(elem))) {
                $(elem).addClass("can-select");
                $(elem).removeClass("cant-select");
            } else {
                $(elem).removeClass("can-select");
                $(elem).addClass("cant-select");
            }
        }

    } else {
        console.log("保存された盤面がありません");  // 保存されたデータがない場合
    }
}


/**
 * 盤面初期化イベント
 */
function initializeEvent() {
    // トースターと置ける場所の表示を消去
    toastr.remove();
    $(".square").removeClass("selected");

    // カウントダウンが進行中であれば停止する
    if (countdownInProgress) {
        clearTimeout(countdownTimer);  // 進行中のカウントダウンを停止
        countdownInProgress = false;   // フラグをリセット
        toastr.remove();  // カウントダウンメッセージを消す
    }

    // 強調表示を解除（すべてのマスからhighlightクラスを削除）
    $(".square").removeClass("highlight");

    // マスの属性をリセットする
    $(".square")
        .removeClass("selected")
        .text("")
        .attr("data-owner", "");

    // 奇数番手に戻す
    isOddTurn = true;

    // 初期値設定
    changeOwner(getTargetSquare(1, 2));
    changeOwner(getTargetSquare(1, 1));
    changeOwner(getTargetSquare(2, 1));
    changeOwner(getTargetSquare(2, 2));

    // タイマーのリセット
    player1Time = 30;
    player2Time = 30;
    updateTimerDisplay();

    // カウントダウン進行フラグをリセット
    countdownInProgress = false;  // これを追加

    // カウントダウンを開始
    startCountdown();  // 再度カウントダウンを開始

    stopTimer();
}


/**
 * カウントダウンを開始する関数
 */
function startCountdown() {
    // カウントダウンが進行中の場合は、再度カウントダウンを開始しない
    if (countdownInProgress) {
        return;  // 進行中ならば何もしない
    }

    let countdown = 10;  // ゲーム開始までの秒数
    countdownInProgress = true;  // カウントダウンが始まったことをフラグで記録

    // 最初のカウントダウンメッセージを表示
    toastr.info(`ゲーム開始まであと <span id="countdown-number">${countdown}</span>秒 <br>※クリックでもスタート`);


    // トースターが表示された後、ダブルクリックで非表示にする
    $(document).on('dblclick', '.toast', function() {
        toastr.clear($(this));  // クリックしたトースターだけを非表示にする
    });

    function updateCountdown() {
        countdown--;  // 1秒ずつカウントダウン

        // カウントダウンが終了したら
        if (countdown < 0) {
            toastr.remove();  // カウントダウンメッセージを消す
            toastr.info("ゲーム開始！<br>黒の番です");
            countdownInProgress = false; // カウントダウン終了時にフラグをリセット
            startTimer();
        } else {
            // 数字のみを更新
            document.getElementById("countdown-number").innerText = countdown;

            // 1秒後に次のカウントダウンを更新
            countdownTimer = setTimeout(updateCountdown, 1000);
        }
    }

    // 最初のカウントダウンを開始
    countdownTimer = setTimeout(updateCountdown, 1000);
}

/**
 * タイマーを開始する関数
 */
function startTimer() {
    // 既存のタイマーを停止する
    stopTimer();

    // 現在のターンに応じてタイマーを開始
    if (isOddTurn) {
        player1TimerInterval = setInterval(() => {
            player1Time--;
            if (player1Time <= 0) {
                stopTimer();
                toastEndMessage("黒のタイマーが0になりました<br>白の勝利");
            } else {
                updateTimerDisplay();
            }
        }, 1000);
    } else {
        player2TimerInterval = setInterval(() => {
            player2Time--;
            if (player2Time <= 0) {
                stopTimer();
                toastEndMessage("白のタイマーが0になりました<br>黒の勝利");
            } else {
                updateTimerDisplay();
            }
        }, 1000);
    }
}


/**
 * タイマーを停止する関数
 */
function stopTimer() {
    clearInterval(player1TimerInterval);
    clearInterval(player2TimerInterval);
}

/**
 * タイマーの表示を更新する関数
 */
function updateTimerDisplay() {
    $("#player1-time").text(player1Time);
    $("#player2-time").text(player2Time);
}

/**
 * ページ遷移
 */
function goToindex0() {
    window.location.href = 'index.html';
}

// audioPlayer と source の定義
const audioPlayer = document.getElementById('audioPlayer');
const source = document.getElementById('audioSource');

// 各BGMのURLを設定
const bgmFiles = {
  "BGM1": "BGM/アリア.mp3",
  "BGM2": "BGM/アイネクライネ.mp3",
  "BGM3": "BGM/トルコ.mp3",
  "BGM4": "BGM/春.mp3"
};

// BGMを再生する関数
function playBGM(bgmId) {
  const bgmPath = bgmFiles[bgmId];  // 対応するBGMのパスを取得
  
  if (bgmPath) {
    // 既に再生中のBGMを停止
    audioPlayer.pause();
    audioPlayer.currentTime = 0;  // 再生位置を最初に戻す
    source.src = bgmPath;  // オーディオソースを変更
    audioPlayer.load();     // ソース変更後に再読み込み
    audioPlayer.play();     // BGMを再生
  }
}

// ボタンにクリックイベントを追加
document.getElementById('btn-BGM1').addEventListener('click', function() {
  playBGM('BGM1');
});
document.getElementById('btn-BGM2').addEventListener('click', function() {
  playBGM('BGM2');
});
document.getElementById('btn-BGM3').addEventListener('click', function() {
  playBGM('BGM3');
});
document.getElementById('btn-BGM4').addEventListener('click', function() {
  playBGM('BGM4');
});



/*****************************************
 * 内部関数
 *****************************************/
/**
 * マス目の所有者を変更する
 */
function changeOwner(square) {
    // マス目にピースを置く
    putPiece(square, getTurnString());

    // 隣接するピースを反転する
    changeOwnerOpposite(square);

    // ターンを変更する
    changeTurn();
}

/**
 * マス目にピースを置く
 */
function putPiece(targetSquare, owner) {
    targetSquare.text("●").attr("data-owner", owner).addClass("selected");
}

/**
 * ターンを示す文字列を取得する
 */
function getTurnString() {
    if (isOddTurn) {
        return "black";
    }
    return "white";
}

/**
 * ターンを変更する
 */
function changeTurn() {

    // ターンを変更する
    isOddTurn = !isOddTurn;

    // 選択可否を設定する
    for (let elem of $(".square")) {
        if (canSelect($(elem))) {
            $(elem).addClass("can-select");
            $(elem).removeClass("cant-select");
        } else {
            $(elem).removeClass("can-select");
            $(elem).addClass("cant-select");
        }
    }
    startTimer();
}



/**
 * 指定位置のマス目オブジェクトを取得する
 */
function getTargetSquare(row, col) {
    return $("[data-row=" + row + "][data-col=" + col + "]");
}

/**
 * 指定されたマス目が選択できるか判定する
 */
function canSelect(square) {
    // 既にピースが設定されている場合は選択不可
    if (square.hasClass("selected")) {
        return false;
    }

    // 各方向に対向先が存在するか判定する
    let row = square.data("row");
    let col = square.data("col");
    if (getPosOppositeUpper(row, col) != null) {
        return true;
    }
    if (getPosOppositeLower(row, col) != null) {
        return true;
    }
    if (getPosOppositeLeft(row, col) != null) {
        return true;
    }
    if (getPosOppositeRight(row, col) != null) {
        return true;
    }
    if (getPosOppositeUpperLeft(row, col) != null) {
        return true;
    }
    if (getPosOppositeUpperRight(row, col) != null) {
        return true;
    }
    if (getPosOppositeLowerLeft(row, col) != null) {
        return true;
    }
    if (getPosOppositeLowerRight(row, col) != null) {
        return true;
    }

    return false;
}

/**
 * 所有者を変更する
 */
function changeOwnerOpposite(square) {
    // クリックされたマス目の位置を取得する
    let row = square.data("row");
    let col = square.data("col");

    // 所有者を変更する
    changeOwnerOppositeUpper(row, col);
    changeOwnerOppositeLower(row, col);
    changeOwnerOppositeLeft(row, col);
    changeOwnerOppositeRight(row, col);
    changeOwnerOppositeUpperLeft(row, col);
    changeOwnerOppositeUpperRight(row, col);
    changeOwnerOppositeLowerLeft(row, col);
    changeOwnerOppositeLowerRight(row, col);
}

/**
 * 所有者を変更する(上)
 */
function changeOwnerOppositeUpper(row, col) {
    // 対向先を取得する
    let endPos = getPosOppositeUpper(row, col);
    if (endPos == null) {
        return;
    }

    // 対向先まで所有者を変更する
    let targetCol = col;
    for (targetRow = row - 1; endPos.row < targetRow; targetRow--) {
        let square = getTargetSquare(targetRow, targetCol);
        putPiece(square, getTurnString());
    }
}

/**
 * 対向の所有マスの位置を取得する(上)
 */
function getPosOppositeUpper(row, col) {
    // 基準マスが最端の場合は対向先が存在しない
    if (row == 0) {
        return null;
    }

    // 隣接マスが相手所有ではない場合は対向先が存在しない
    let targetRow = row - 1;
    let targetCol = col;
    if (getSquareStatus(targetRow, targetCol) != SQUARE_STATUS_IS_OTHER) {
        return null;
    }

    // 対向先の有無を判定する
    for (targetRow--; 0 <= targetRow; targetRow--) {
        // マスの状態を取得する
        let squareType = getSquareStatus(targetRow, targetCol);

        // 選択されていないマスに到達した場合は終了する
        if (squareType == SQUARE_STATUS_NOT_SELECTED) {
            return null;
        }

        // 自分の所有マスに到達した場合、位置を返却する
        if (squareType == SQUARE_STATUS_IS_OWNED) {
            return {
                row: targetRow,
                col: targetCol,
            };
        }
    }
    return null;
}

/**
 * 所有者を変更する(下)
 */
function changeOwnerOppositeLower(row, col) {
    // 対向先を取得する
    let endPos = getPosOppositeLower(row, col);
    if (endPos == null) {
        return;
    }

    // 対向先まで所有者を変更する
    let targetCol = col;
    for (targetRow = row + 1; targetRow < endPos.row; targetRow++) {
        let square = getTargetSquare(targetRow, targetCol);
        putPiece(square, getTurnString());
    }
}

/**
 * 対向の所有マスの位置を取得する(下)
 */
function getPosOppositeLower(row, col) {
    // 基準マスが最端の場合は対向先が存在しない
    if (row == 7) {
        return null;
    }

    // 隣接マスが相手所有ではない場合は対向先が存在しない
    let targetRow = row + 1;
    let targetCol = col;
    if (getSquareStatus(targetRow, targetCol) != SQUARE_STATUS_IS_OTHER) {
        return null;
    }

    // 対向先の有無を判定する
    for (targetRow++; targetRow <= 7; targetRow++) {
        // マスの状態を取得する
        let squareType = getSquareStatus(targetRow, targetCol);

        // 選択されていないマスに到達した場合は終了する
        if (squareType == SQUARE_STATUS_NOT_SELECTED) {
            return null;
        }

        // 自分の所有マスに到達した場合、位置を返却する
        if (squareType == SQUARE_STATUS_IS_OWNED) {
            return {
                row: targetRow,
                col: targetCol,
            };
        }
    }
    return null;
}

/**
 * 所有者を変更する(左)
 */
function changeOwnerOppositeLeft(row, col) {
    // 対向先を取得する
    let endPos = getPosOppositeLeft(row, col);
    if (endPos == null) {
        return;
    }

    // 対向先まで所有者を変更する
    let targetRow = row;
    for (targetCol = col - 1; endPos.col < targetCol; targetCol--) {
        let square = getTargetSquare(targetRow, targetCol);
        putPiece(square, getTurnString());
    }
}

/**
 * 対向の所有マスの位置を取得する(左)
 */
function getPosOppositeLeft(row, col) {
    // 基準マスが最端の場合は対向先が存在しない
    if (col == 0) {
        return null;
    }

    // 隣接マスが相手所有ではない場合は対向先が存在しない
    let targetRow = row;
    let targetCol = col - 1;
    if (getSquareStatus(targetRow, targetCol) != SQUARE_STATUS_IS_OTHER) {
        return null;
    }

    // 対向先の有無を判定する
    for (targetCol--; 0 <= targetCol; targetCol--) {
        // マスの状態を取得する
        let squareType = getSquareStatus(targetRow, targetCol);

        // 選択されていないマスに到達した場合は終了する
        if (squareType == SQUARE_STATUS_NOT_SELECTED) {
            return null;
        }

        // 自分の所有マスに到達した場合、位置を返却する
        if (squareType == SQUARE_STATUS_IS_OWNED) {
            return {
                row: targetRow,
                col: targetCol,
            };
        }
    }
    return null;
}

/**
 * 所有者を変更する(右)
 */
function changeOwnerOppositeRight(row, col) {
    // 対向先を取得する
    let endPos = getPosOppositeRight(row, col);
    if (endPos == null) {
        return;
    }

    // 対向先まで所有者を変更する
    let targetRow = row;
    for (targetCol = col + 1; targetCol < endPos.col; targetCol++) {
        let square = getTargetSquare(targetRow, targetCol);
        putPiece(square, getTurnString());
    }
}

/**
 * 対向の所有マスの位置を取得する(右)
 */
function getPosOppositeRight(row, col) {
    // 基準マスが最端の場合は対向先が存在しない
    if (col == 7) {
        return null;
    }

    // 隣接マスが相手所有ではない場合は対向先が存在しない
    let targetRow = row;
    let targetCol = col + 1;
    if (getSquareStatus(targetRow, targetCol) != SQUARE_STATUS_IS_OTHER) {
        return null;
    }

    // 対向先の有無を判定する
    for (targetCol++; targetCol <= 7; targetCol++) {
        // マスの状態を取得する
        let squareType = getSquareStatus(targetRow, targetCol);

        // 選択されていないマスに到達した場合は終了する
        if (squareType == SQUARE_STATUS_NOT_SELECTED) {
            return null;
        }

        // 自分の所有マスに到達した場合、位置を返却する
        if (squareType == SQUARE_STATUS_IS_OWNED) {
            return {
                row: targetRow,
                col: targetCol,
            };
        }
    }
    return null;
}

/**
 * 所有者を変更する(左上)
 */
function changeOwnerOppositeUpperLeft(row, col) {
    // 対向先を取得する
    let endPos = getPosOppositeUpperLeft(row, col);
    if (endPos == null) {
        return;
    }

    // 対向先まで所有者を変更する
    for (
        targetRow = row - 1, targetCol = col - 1;
        endPos.row < targetRow, endPos.col < targetCol;
        targetRow--, targetCol--
    ) {
        let square = getTargetSquare(targetRow, targetCol);
        putPiece(square, getTurnString());
    }
}

/**
 * 対向の所有マスの位置を取得する(左上)
 */
function getPosOppositeUpperLeft(row, col) {
    // 基準マスが最端の場合は対向先が存在しない
    if (row == 0 || col == 0) {
        return null;
    }

    // 隣接マスが相手所有ではない場合は対向先が存在しない
    let targetRow = row - 1;
    let targetCol = col - 1;
    if (getSquareStatus(targetRow, targetCol) != SQUARE_STATUS_IS_OTHER) {
        return null;
    }

    // 対向先の有無を判定する
    for (
        targetRow--, targetCol--;
        0 <= targetRow, 0 <= targetCol;
        targetRow--, targetCol--
    ) {
        // マスの状態を取得する
        let squareType = getSquareStatus(targetRow, targetCol);

        // 選択されていないマスに到達した場合は終了する
        if (squareType == SQUARE_STATUS_NOT_SELECTED) {
            return null;
        }

        // 自分の所有マスに到達した場合、位置を返却する
        if (squareType == SQUARE_STATUS_IS_OWNED) {
            return {
                row: targetRow,
                col: targetCol,
            };
        }
    }
    return null;
}

/**
 * 所有者を変更する(右上)
 */
function changeOwnerOppositeUpperRight(row, col) {
    // 対向先を取得する
    let endPos = getPosOppositeUpperRight(row, col);
    if (endPos == null) {
        return;
    }

    // 対向先まで所有者を変更する
    for (
        targetRow = row - 1, targetCol = col + 1;
        endPos.row < targetRow, targetCol < endPos.col;
        targetRow--, targetCol++
    ) {
        let square = getTargetSquare(targetRow, targetCol);
        putPiece(square, getTurnString());
    }
}

/**
 * 対向の所有マスの位置を取得する(右上)
 */
function getPosOppositeUpperRight(row, col) {
    // 基準マスが最端の場合は対向先が存在しない
    if (row == 0 || col == 7) {
        return null;
    }

    // 隣接マスが相手所有ではない場合は対向先が存在しない
    let targetRow = row - 1;
    let targetCol = col + 1;
    if (getSquareStatus(targetRow, targetCol) != SQUARE_STATUS_IS_OTHER) {
        return null;
    }

    // 対向先の有無を判定する
    for (
        targetRow--, targetCol++;
        0 <= targetRow, targetCol <= 7;
        targetRow--, targetCol++
    ) {
        // マスの状態を取得する
        let squareType = getSquareStatus(targetRow, targetCol);

        // 選択されていないマスに到達した場合は終了する
        if (squareType == SQUARE_STATUS_NOT_SELECTED) {
            return null;
        }

        // 自分の所有マスに到達した場合、位置を返却する
        if (squareType == SQUARE_STATUS_IS_OWNED) {
            return {
                row: targetRow,
                col: targetCol,
            };
        }
    }
    return null;
}

/**
 * 所有者を変更する(左下)
 */
function changeOwnerOppositeLowerLeft(row, col) {
    // 対向先を取得する
    let endPos = getPosOppositeLowerLeft(row, col);
    if (endPos == null) {
        return;
    }

    // 対向先まで所有者を変更する
    for (
        targetRow = row + 1, targetCol = col - 1;
        targetRow < endPos.row, endPos.col < targetCol;
        targetRow++, targetCol--
    ) {
        let square = getTargetSquare(targetRow, targetCol);
        putPiece(square, getTurnString());
    }
}

/**
 * 対向の所有マスの位置を取得する(左下)
 */
function getPosOppositeLowerLeft(row, col) {
    // 調査対象が最端の場合は終了する
    if (row == 7 || col == 0) {
        return null;
    }

    // 隣接マスが相手所有ではない場合は対向先が存在しない
    let targetRow = row + 1;
    let targetCol = col - 1;
    if (getSquareStatus(targetRow, targetCol) != SQUARE_STATUS_IS_OTHER) {
        return null;
    }

    // 対向先の有無を判定する
    for (
        targetRow++, targetCol--;
        targetRow <= 7, 0 <= targetCol;
        targetRow++, targetCol--
    ) {
        // マスの状態を取得する
        let squareType = getSquareStatus(targetRow, targetCol);

        // 選択されていないマスに到達した場合は終了する
        if (squareType == SQUARE_STATUS_NOT_SELECTED) {
            return null;
        }

        // 自分の所有マスに到達した場合、位置を返却する
        if (squareType == SQUARE_STATUS_IS_OWNED) {
            return {
                row: targetRow,
                col: targetCol,
            };
        }
    }
    return null;
}

/**
 * 所有者を変更する(右下)
 */
function changeOwnerOppositeLowerRight(row, col) {
    // 対向先を取得する
    let endPos = getPosOppositeLowerRight(row, col);
    if (endPos == null) {
        return;
    }

    // 対向先まで所有者を変更する
    for (
        targetRow = row + 1, targetCol = col + 1;
        targetRow < endPos.row, targetCol < endPos.col;
        targetRow++, targetCol++
    ) {
        let square = getTargetSquare(targetRow, targetCol);
        putPiece(square, getTurnString());
    }
}

/**
 * 対向の所有マスの位置を取得する(右下)
 */
function getPosOppositeLowerRight(row, col) {
    // 基準マスが最端の場合は対向先が存在しない
    if (row == 7 || col == 7) {
        return null;
    }

    // 隣接マスが相手所有ではない場合は対向先が存在しない
    let targetRow = row + 1;
    let targetCol = col + 1;
    if (getSquareStatus(targetRow, targetCol) != SQUARE_STATUS_IS_OTHER) {
        return null;
    }

    // 対向先の有無を判定する
    for (
        targetRow++, targetCol++;
        targetRow <= 7, targetCol <= 7;
        targetRow++, targetCol++
    ) {
        // マスの状態を取得する
        let squareType = getSquareStatus(targetRow, targetCol);

        // 選択されていないマスに到達した場合は終了する
        if (squareType == SQUARE_STATUS_NOT_SELECTED) {
            return null;
        }

        // 自分の所有マスに到達した場合、位置を返却する
        if (squareType == SQUARE_STATUS_IS_OWNED) {
            return {
                row: targetRow,
                col: targetCol,
            };
        }
    }
    return null;
}

/**
 * 調査対象のマス目の状態を取得する
 */
function getSquareStatus(row, col) {
    // マスを取得する
    let targetSquare = getTargetSquare(row, col);

    // selectedクラスを持っていなければ未選択
    if (!targetSquare.hasClass("selected")) {
        return SQUARE_STATUS_NOT_SELECTED;
    }

    // 自分が所有している
    if (getTurnString() == targetSquare.attr("data-owner")) {
        return SQUARE_STATUS_IS_OWNED;
    }

    // 相手が所有している
    return SQUARE_STATUS_IS_OTHER;
}

/**
 * ゲーム終了を判定する
 */
function isGameEnd() {
    if ($(".square.selected").length == 16) {
        return true;
    }
    return false;
}

/**
 * ゲーム終了メッセージを表示する
 */
function toastEndMessage(message) {
    let countBlack = $("[data-owner=black]").length;
    let countWhite = $("[data-owner=white]").length;

    let judgeString =
        "黒:" + countBlack + "<br/>" + "白:" + countWhite + "<br/>";

    // メッセージを表示する
    if (countBlack == countWhite) {
        toastr.success(message + "<br/>" + judgeString + "引き分け");
    } else if (countBlack < countWhite) {
        toastr.success(message + "<br/>" + judgeString + "白の勝利");
    } else {
        toastr.success(message + "<br/>" + judgeString + "黒の勝利");
    }
    stopTimer();
}

/**
 * 番手がパスかどうかを判定する
 */
function isPass() {
    if ($(".square.can-select").length == 0) {
        return true;
    }
    return false;
}