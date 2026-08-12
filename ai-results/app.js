(() => {
  "use strict";

  const data = window.JRA_AI_RESULTS;
  const $ = (id) => document.getElementById(id);
  const num = (value) => Number(value || 0).toLocaleString("ja-JP");
  const pct = (value, digits = 1) => `${Number(value || 0).toFixed(digits)}%`;
  const yen = (value) => `${Number(value || 0) >= 0 ? "+" : ""}${num(value)}円`;
  const localDate = (value) => value ? new Intl.DateTimeFormat("ja-JP", {
    year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(new Date(value)) : "-";

  function channelRow(label, result, kind) {
    const roiClass = Number(result.roi || 0) >= 100 ? "positive" : "negative";
    const profitClass = Number(result.profitYen || 0) >= 0 ? "positive" : "negative";
    return `<tr><td><span class="channel-dot ${kind}"></span>${label}</td><td>${num(result.bets)}</td>`
      + `<td>${num(result.wins)}</td><td>${pct(result.hitRate)}</td>`
      + `<td class="${roiClass}">${pct(result.roi)}</td><td class="${profitClass}">${yen(result.profitYen)}</td></tr>`;
  }

  function renderEvaluation() {
    const evaluation = data.v2?.frozenEvaluation || {};
    const protocol = data.v2?.frozenProtocol || {};
    const completed = Number(evaluation.completedEligibleRaces || 0);
    const minimum = Number(evaluation.minimumRacesBeforeReview || protocol.minimum_races_before_review || 500);
    const progress = Math.min(Number(evaluation.reviewProgressPercent || 0), 100);
    $("progressCount").textContent = `${num(completed)} / ${num(minimum)} レース`;
    $("progressBar").style.width = `${progress}%`;
    $("progressText").textContent = `${evaluation.startDate || protocol.unseen_start_date || "2026-08-15"}から集計 / ${progress.toFixed(1)}%`;
    $("primaryBets").textContent = num(evaluation.primaryEv105?.bets);
    $("primaryRoi").textContent = pct(evaluation.primaryEv105?.roi);
    $("shadow100Roi").textContent = pct(evaluation.shadowEv100?.roi);
    $("shadow095Roi").textContent = pct(evaluation.shadowEv095?.roi);
    $("channelRows").innerHTML = [
      channelRow("本線 EV 1.05以上", evaluation.primaryEv105 || {}, "primary"),
      channelRow("シャドー EV 1.00以上", evaluation.shadowEv100 || {}, "shadow100"),
      channelRow("シャドー EV 0.95以上", evaluation.shadowEv095 || {}, "shadow095"),
    ].join("");
  }

  function renderPredictions() {
    const races = data.recentPredictions || [];
    if (!races.length) {
      $("predictionList").innerHTML = '<p class="empty">保存済みの予想はありません</p>';
      return;
    }
    $("predictionList").innerHTML = races.map((race) => {
      const title = [race.raceDate, race.course, race.raceNo ? `${race.raceNo}R` : "", race.raceName].filter(Boolean).join(" ");
      const detail = [race.surface, race.distance ? `${num(race.distance)}m` : "", localDate(race.predictedAt)].filter(Boolean).join(" / ");
      const rows = (race.recommendations || []).map((horse) => `<tr>
        <td>${num(horse.rank)}</td><td class="horse">${num(horse.horseNumber)} ${horse.horse || "-"}</td>
        <td>${pct(Number(horse.predictedWinProb || 0) * 100, 2)}</td><td>${Number(horse.odds || 0).toFixed(1)}</td>
        <td>${Number(horse.expectedIndex || 0).toFixed(3)}</td><td>${horse.finish ? `${num(horse.finish)}着` : "-"}</td>
      </tr>`).join("");
      return `<article class="race-card"><div class="race-title"><div><h3>${title || race.source}</h3><p>${detail}</p></div><span>${race.decision || "判定なし"}</span></div>
        <div class="table-scroll"><table><thead><tr><th>順位</th><th>馬</th><th>推定勝率</th><th>単勝</th><th>保守EV</th><th>結果</th></tr></thead><tbody>${rows}</tbody></table></div></article>`;
    }).join("");
  }

  function metric(label, value) {
    return `<div><dt>${label}</dt><dd>${value}</dd></div>`;
  }

  function renderAudit() {
    const fundamental = data.v2?.fundamental || {};
    const ab = fundamental.workout_ab_test || {};
    const adopted = Boolean(ab.adopted);
    $("workoutState").textContent = adopted ? "採用" : "不採用";
    $("workoutState").classList.toggle("is-good", adopted);
    $("workoutMetrics").innerHTML = [
      metric("2024 LogLoss 調教なし", Number(ab.baseline_validation_2024?.log_loss || 0).toFixed(6)),
      metric("2024 LogLoss 調教あり", Number(fundamental.validation_2024?.log_loss || 0).toFixed(6)),
      metric("2025 LogLoss 調教なし", Number(ab.baseline_test_2025?.log_loss || 0).toFixed(6)),
      metric("2025 LogLoss 調教あり", Number(fundamental.test_2025?.log_loss || 0).toFixed(6)),
    ].join("");
    const residual = data.v2?.residual || {};
    const shrink = residual.selected_shrinkage || {};
    $("residualMetrics").innerHTML = [
      metric("5倍以下", Number(shrink.odds_5_or_less || 0).toFixed(2)),
      metric("5倍超-15倍", Number(shrink.odds_5_to_15 || 0).toFixed(2)),
      metric("15倍超", Number(shrink.odds_over_15 || 0).toFixed(2)),
      metric("オッズ下落係数", Number(residual.odds_haircut || 0).toFixed(4)),
    ].join("");
  }

  function render() {
    if (!data) {
      document.body.innerHTML = '<p class="empty">公開データを読み込めませんでした</p>';
      return;
    }
    $("updatedAt").textContent = `更新 ${localDate(data.generatedAt)}`;
    renderEvaluation();
    renderPredictions();
    renderAudit();
  }

  document.querySelectorAll(".tabs button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tabs button").forEach((item) => item.classList.toggle("is-active", item === button));
      document.querySelectorAll(".view").forEach((view) => view.classList.remove("is-active"));
      $(`${button.dataset.view}View`).classList.add("is-active");
    });
  });

  render();
})();

