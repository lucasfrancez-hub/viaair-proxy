export default async function handler(req, res) {
  try {
    const base = "https://www.comprarviagem.com.br/viaair/flight-list";
    const target = new URL(base);

    // Repasse todos os query params
    for (const [k, v] of Object.entries(req.query || {})) {
      if (v !== undefined && v !== null && `${v}` !== "") target.searchParams.set(k, v);
    }

    // Headers "de navegador" para aumentar a chance de vir JSON
    const r = await fetch(target.toString(), {
      redirect: "follow",
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": "https://www.comprarviagem.com.br/viaair/",
        "Origin": "https://www.comprarviagem.com.br",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
      }
    });

    const status = r.status;
    const contentType = r.headers.get("content-type") || "";
    const text = await r.text();

    // DEBUG forçado
    if (req.query.debug === "1") {
      const headersObj = {};
      r.headers.forEach((v, k) => (headersObj[k] = v));
      return res.status(200).json({
        debug: {
          requested: target.toString(),
          status,
          contentType,
          length: text.length,
          preview: text.slice(0, 700),
          responseHeaders: headersObj
        }
      });
    }

    // Tenta JSON
    let data = null;
    if (contentType.includes("application/json")) {
      data = JSON.parse(text);
    } else {
      try { data = JSON.parse(text); } catch { /* não é json */ }
    }

    if (!data || (!data.flights && !data.items)) {
      return res.status(200).json({
        messages: [
          { text: "Posso preparar propostas sob medida para esse trecho ✈️" },
          { text: "Prefere algum horário de saída, companhia aérea ou incluir bagagem?" }
        ],
        _debug: { status, contentType, len: text.length }
      });
    }

    // Entrega o JSON cru
    return res.status(200).json(data);

  } catch (err) {
    return res.status(200).json({
      messages: [{ text: "Não consegui consultar agora, mas posso preparar propostas sob medida para você." }],
      _error: String(err)
    });
  }
}
