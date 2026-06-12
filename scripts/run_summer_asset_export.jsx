#target photoshop

(function () {
  var log = new File("E:/s/Desktop/Summer/static/branding/wrapper-log.txt");
  var out = new Folder("E:/s/Desktop/Summer/static/branding");
  if (!out.exists) out.create();
  log.encoding = "UTF8";
  log.open("w");
  log.write("wrapper start\n");
  try {
    $.evalFile(new File("E:/s/Desktop/Summer/scripts/create_summer_photoshop_assets.jsx"));
    log.write("wrapper done\n");
  } catch (err) {
    log.write("wrapper failed\n");
    log.write("Message: " + err.message + "\n");
    log.write("Line: " + err.line + "\n");
    log.write("File: " + err.fileName + "\n");
  }
  log.close();
})();
