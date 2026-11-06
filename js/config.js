/*
 * Configuración de la carta. Es el único archivo que necesitas tocar
 * (además de data/carta.csv o la hoja de Google).
 */
window.CARTA_CONFIG = {
  nombre: "La Hispana",
  subtitulo: "Café Bar | Café Bar",

  // OPCIONAL: URL de la hoja de Google publicada como CSV.
  // Si la rellenas, la carta se lee de ahí y data/carta.csv queda como respaldo.
  // Ejemplo: "https://docs.google.com/spreadsheets/d/e/XXXX/pub?gid=0&single=true&output=csv"
  googleSheetCsvUrl: "",

  // OPCIONAL: PDF de la carta para descargar (déjalo en la carpeta y pon "carta.pdf").
  pdfUrl: "",

  // OPCIONAL: datos de contacto que se muestran al pie. Deja "" para ocultar.
  direccion: "",
  telefono: "",
  horario: "",          // admite "Español | English"
  instagram: "",        // URL completa, p. ej. "https://instagram.com/lahispana"
  googleMaps: "",       // URL de la ficha de Google Maps

  // Avisos legales del pie (admiten "Español | English").
  avisos: [
    "Todos los precios incluyen IVA. | All prices include VAT.",
    "Establecimiento con información disponible en materia de alergias e intolerancias alimentarias (Reglamento (UE) nº 1169/2011). Para más información, consulta al personal. | Information on food allergies and intolerances is available (Regulation (EU) No 1169/2011). Please ask our staff."
  ]
};
