function doGet(e) {
  return ContentService.createTextOutput(LanguageApp.translate(e.parameter.text, e.parameter.source, e.parameter.target));
}