export default async function handler(req, res) {
  try {
    const base = "https://www.comprarviagem.com.br/viaair/flight-list";
    const target = new URL(base);
    for (const [k, v] of Object.entries(req.query)) target.searchParams.set(k, v);

    const r = await fetch(target.toString(), {
      headers: {
        "Accept": "application/json, text/plain, */*",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": "https://www.comprarviagem.com.br/",
        "User-Agent": "ViaAirBot/1.0"
      }
    });

    const text = await r.text();
    let data; try { data = JSON.parse(text); } catch { data = null; }

    if (!data || (!data.flights && !data.items)) {
      return res.status(200).json({
        messages: [
          { text: "Posso preparar propostas sob medida para esse trecho ✈️" },
          { text: "Prefere algum horário de saída, companhia aérea ou incluir bagagem?" }
        ]
      });
    }

    const flightsRaw = data.flights || data.items || [];
    const flights = flightsRaw.map(x => ({
      airline: x.airline || x.company || "—",
      dep: x.departureTime || x.departure?.time || "—",
      arr: x.arrivalTime || x.arrival?.time || "—",
      stops: Number(x.stops ?? 0),
      total: Number(x.fare?.total ?? x.price?.total ?? 0),
      curr: (x.fare?.currency || x.price?.currency || "BRL")
    }))
    .filter(f => f.total > 0)
    .sort((a,b)=>a.total-b.total)
    .slice(0,3);

    if (!flights.length) {
      return res.status(200).json({
        messages: [
          { text: "Posso preparar propostas sob medida para esse período ✈️" },
          { text: "Você prefere algum horário, companhia ou incluir bagagem despachada?" }
        ]
      });
    }

    const fmt = (v,c) => new Intl.NumberFormat("pt-BR",{style:"currency",currency:c||"BRL"}).format(v);
    const best = flights[0];

    return res.status(200).json({
      set_attributes: {
        cv_best_price_total: fmt(best.total, best.curr),
        cv_best_airline: best.airline,
        cv_best_departure_time: best.dep,
        cv_best_arrival_time: best.arr
      },
      messages: [
        { text: "Encontrei boas opções para este trecho 😊" },
        ...flights.map((f,i)=>({
          text: `${i+1}) ${f.airline} • ${f.dep} → ${f.arr} • ${f.stops===0?"direto":`${f.stops} parada(s)`} • ${fmt(f.total,f.curr)}`
        })),
        { text: "Quer que eu siga com a melhor tarifa agora ou prefere filtrar por horário/companhia?" }
      ]
    });
  } catch {
    return res.status(200).json({
      messages: [{ text: "Nossa conversa deu uma pausa. Posso preparar propostas sob medida para você?" }]
    });
  }
}
