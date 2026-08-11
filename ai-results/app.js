(() => {
  "use strict";

  const data = window.JRA_AI_RESULTS;
  const $ = (id) => document.getElementById(id);
  const number = (value) => Number(value || 0).toLocaleString("ja-JP");
  const percent = (value, digits = 2) => `${Number(value || 0).toFixed(digits)}%`;
  const yen = (value) => `${Number(value || 0) >= 0 ? "+" : ""}${number(value)}円`;
  const date = (value) => value ? new Intl.DateTimeFormat("ja-JP", {
    year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(new Date(value)) : "-";

  function metric(label, value) {
    return `<div><dt>${label}</dt><dd>${value}</dd></div>`;
  }

  function renderStrategy(prefix, result, promotable) {
    const state = $(`${prefix}State`);
    state.textContent = promotable ? "昇格可能" : "見送り";
    state.className = `state-badge ${promotable ? "is-ready" : "is-stop"}`;
    $(`${prefix}Metrics`).innerHTML = [
      metric("投票", `${number(result.bets)}件`),
      metric("的中率", percent(result.hit_rate)),
      metric("回収率", percent(result.roi)),
      metric("的中", `${number(result.wins)}件`),
      metric("払戻", `${number(result.payout_yen)}円`),
      metric("損益", yen(result.profit_yen)),
    ].join("");
  }

  function renderOddsBands(model = "profit") {
    const bands = model === "profit"
      ? data.profitModel.testByOddsBand
      : data.oddsMovement.testByOddsBand;
    $("oddsBands").innerHTML = Object.entries(bands || {}).map(([label, row]) => {
      const roiClass = Number(row.roi) >= 100 ? "positive" : "negative";
      const profitClass = Number(row.profit_yen) >= 0 ? "positive" : "negative";
      return `<tr>
        <td>${label}</td><td>${number(row.bets)}</td><td>${number(row.wins)}</td>
        <td>${percent(row.hit_rate)}</td><td class="${roiClass}">${percent(row.roi)}</td>
        <td class="${profitClass}">${yen(row.profit_yen)}</td>
      </tr>`;
    }).join("");
  }

  function renderPredictions() {
    const races = data.recentPredictions || [];
    if (!races.length) {
      $("predictionList").innerHTML = '<p class="empty">保存済みの予想はありません</p>';
      return;
    }
    $("predictionList").innerHTML = races.map((race) => {
      const title = [race.raceDate, race.course, race.raceNo ? `${race.raceNo}R` : "", race.raceName]
        .filter(Boolean).join(" ");
      const condition = [race.surface, race.distance ? `${number(race.distance)}m` : "", `予想 ${date(race.predictedAt)}`]
        .filter(Boolean).join(" / ");
      const rows = (race.recommendations || []).map((horse) => `<tr>
        <td>${number(horse.rank)}</td>
        <td class="horse-name">${number(horse.horseNumber)} ${horse.horse || "-"}</td>
        <td>${percent(Number(horse.predictedWinProb) * 100)}</td>
        <td>${Number(horse.odds || 0).toFixed(1)}</td>
        <td>${Number(horse.expectedIndex || 0).toFixed(2)}</td>
        <td>${horse.finish ? `${number(horse.finish)}着` : "-"}</td>
      </tr>`).join("");
      return `<article class="prediction-race">
        <div class="race-heading"><div><h3>${title || race.source}</h3><p>${condition}</p></div>
        <span class="race-decision">${race.decision || "判定なし"}</span></div>
        <div class="table-scroll"><table><thead><tr><th>印</th><th>馬</th><th>推定勝率</th><th>単勝</th><th>期待値</th><th>結果</th></tr></thead>
        <tbody>${rows}</tbody></table></div>
      </article>`;
    }).join("");
  }

  function render() {
    if (!data) {
      document.body.innerHTML = '<p class="empty">公開データを読み込めませんでした</p>';
      return;
    }
    const stopped = !data.oddsMovement.promotable || !data.profitModel.promotable;
    $("updatedAt").textContent = `更新 ${date(data.generatedAt)}`;
    $("productionDecision").textContent = stopped ? "実投票 見送り" : "実投票候補";
    $("decisionDetail").textContent = stopped
      ? "未見期間の回収率が基準未達。ペーパー投票を継続します。"
      : "未見期間の基準を通過。追加監査後に投票移行を判断します。";
    $("modelAuc").textContent = Number(data.model.validation.auc || 0).toFixed(3);
    $("paperRoi").textContent = percent(data.baseBacktest.paperOverall.roi);
    $("movementRoi").textContent = percent(data.oddsMovement.test.roi);
    $("profitRoi").textContent = percent(data.profitModel.test.roi);
    $("dataPeriod").textContent = `${data.model.dataStartDate || "-"} - ${data.model.dataEndDate || "-"}`;
    renderStrategy("movement", data.oddsMovement.test, data.oddsMovement.promotable);
    renderStrategy("profit", data.profitModel.test, data.profitModel.promotable);
    $("raceCount").textContent = `レース ${number(data.counts.races)}`;
    $("runnerCount").textContent = `出走 ${number(data.counts.runners)}`;
    $("marketCount").textContent = `市場履歴 ${number(data.counts.oddsSnapshots + data.counts.pairMarketSnapshots)}`;
    $("modelVersion").textContent = `モデル ${data.model.version || "-"}`;
    renderOddsBands();
    renderPredictions();
  }

  document.querySelectorAll(".view-tabs button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".view-tabs button").forEach((item) => item.classList.toggle("is-active", item === button));
      document.querySelectorAll(".view").forEach((view) => view.classList.remove("is-active"));
      $(`${button.dataset.view}View`).classList.add("is-active");
    });
  });

  document.querySelectorAll(".segmented button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".segmented button").forEach((item) => item.classList.toggle("is-active", item === button));
      renderOddsBands(button.dataset.model);
    });
  });

  render();
})();