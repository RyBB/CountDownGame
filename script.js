(() => {
  "use strict";
  let now = 0;
  let startFlag = false;

  const devices = {};

  const getUser = async (ID) => {
    const resp = await kintone.api(
      kintone.api.url("/k/v1/records.json"),
      "GET",
      { app: 429, query: `MESH_ID = "${ID}"` },
    );
    if (resp.records.length !== 1) return "ななし";
    return resp.records[0]["ユーザー選択"].value[0].name;
  };

  const buttonAssign = async (MESH_100BU, peripheral) => {
    const MESHBUTTON = new MESH_100BU(peripheral);
    const player = await getUser(peripheral.localName);
    if (!MESHBUTTON.peripheral.connected) {
      await MESHBUTTON.connectWait();
      MESHBUTTON.onSinglePressed = () => {
        const thisNow = new Date().getTime();
        const diff = (Number(thisNow) - Number(now)) / 1000;
        const time = document.getElementById("number").value;

        const r = (Number(time) - diff + 0.6).toFixed(2);
        console.log(r);

        devices[peripheral.localName] = r;
        const myResult = document.getElementById(
          `result-${peripheral.localName}`,
        );
        // マイナス値だったら赤文字にする
        if (r < 0) myResult.classList.add("red");
        // 結果を描画
        if (!myResult.textContent) {
          myResult.textContent = r;
        }
      };

      // ulに追記
      const $li = document.createElement("li");
      $li.innerHTML = `<div>
      <div class="assign player">${
        peripheral.localName.split("MESH-100BU")[1]
      }</div>
      <div class="name player">${player}</div>
      <div id="result-${peripheral.localName}" class="result player hide"></div>
    </div>`;
      document.getElementById("playerList").appendChild($li);
    }
  };

  kintone.events.on("app.record.index.show", (event) => {
    const obniz = new Obniz("1234-5678", { local_connect: false });
    if (event.viewId !== 8316248) return;
    // obnizの接続
    obniz.onconnect = async () => {
      console.log("obniz connected!");
      await obniz.ble.initWait();
      const MESH_100BU = Obniz.getPartsClass("MESH_100BU");

      console.log("scan start");
      obniz.ble.scan.onfind = async (peripheral) => {
        console.log("name:", peripheral.localName);
        // ボタンブロックなら
        if (MESH_100BU.isMESHblock(peripheral)) {
          // 参加者のアサイン
          await buttonAssign(MESH_100BU, peripheral);
        }
      };

      await obniz.ble.scan.startWait(
        { binary: [[0x4d, 0x45, 0x53, 0x48, 0x2d, 0x31, 0x30, 0x30]] },
        { duration: null, filterOnDevice: true },
      );
    };

    // スタートボタン
    let itvl;
    document.getElementById("start-button").onclick = () => {
      if (startFlag) return;

      now = new Date().getTime();
      console.log(now);

      let time = Number(document.getElementById("number").value);
      let timer;
      let opacity = 1;
      itvl = setInterval(() => {
        timer = time - (new Date().getTime() - now) / 1000;
        document.getElementById("count").textContent = timer.toFixed(2);
        if (timer < time / 2) {
          opacity -= 0.01;
          document.getElementById(
            "count",
          ).style.cssText = `opacity: ${opacity};`;
          // document.getElementById("count").textContent = "???";
        }
        if (timer <= 0) {
          clearInterval(itvl);
          console.log("結果発表！");
          Object.keys(document.getElementsByClassName("result")).forEach(
            (i) => {
              document
                .getElementsByClassName("result")
                [i].classList.remove("hide");
            },
          );
        }
      }, 10);
      startFlag = true;
    };

    // リセットボタン
    document.getElementById("reset-button").onclick = () => {
      clearInterval(itvl);
      startFlag = false;
      document.getElementById("count").style.cssText = `opacity: 1;`;
      document.getElementById("count").textContent = "";

      Object.keys(document.getElementsByClassName("result")).forEach((i) => {
        document.getElementsByClassName("result")[i].textContent = "";
        document.getElementsByClassName("result")[i].classList.add("hide");
        document.getElementsByClassName("result")[i].classList.remove("red");
      });
    };
  });
})();
