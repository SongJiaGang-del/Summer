/*
 * Photoshop JSX asset generator for Summer / 夏日律动.
 *
 * Run from Photoshop: File > Scripts > Browse...
 * Or on Windows via COM:
 *   $ps = New-Object -ComObject Photoshop.Application
 *   $ps.DoJavaScriptFile("E:\\s\\Desktop\\Summer\\scripts\\create_summer_photoshop_assets.jsx")
 */

#target photoshop

(function () {
  var BOOT_ROOT = File($.fileName).parent.parent;
  var BOOT_OUT = new Folder(BOOT_ROOT.fsName + "/static/branding");
  if (!BOOT_OUT.exists) BOOT_OUT.create();
  var ERROR_LOG = new File(BOOT_OUT.fsName + "/photoshop-error.log");
  var PROGRESS_LOG = new File(BOOT_OUT.fsName + "/photoshop-progress.log");
  ERROR_LOG.encoding = "UTF8";
  try {
    PROGRESS_LOG.encoding = "UTF8";
    PROGRESS_LOG.open("w");
    PROGRESS_LOG.write("boot\n");
    PROGRESS_LOG.close();
    main();
  } catch (err) {
    ERROR_LOG.open("w");
    ERROR_LOG.write("Photoshop JSX failed\n");
    ERROR_LOG.write("Message: " + err.message + "\n");
    ERROR_LOG.write("Line: " + err.line + "\n");
    ERROR_LOG.write("File: " + err.fileName + "\n");
    ERROR_LOG.close();
    throw err;
  }

  function main() {
  app.displayDialogs = DialogModes.NO;

  var ROOT = File($.fileName).parent.parent;
  var OUT = new Folder(ROOT.fsName + "/static/branding");
  var ICONS = new Folder(OUT.fsName + "/icons");
  var SPLASH = new Folder(OUT.fsName + "/splash");
  ensureFolder(OUT);
  ensureFolder(ICONS);
  ensureFolder(SPLASH);

  var COLORS = {
    deepSea: "1B4965",
    sea: "2A7F9E",
    mint: "AEEFF0",
    mintBg: "E0F7FA",
    coral: "FF8577",
    lemon: "FFF275",
    white: "FFFFFF",
    ink: "092D3B"
  };

  var previousUnits = app.preferences.rulerUnits;
  app.preferences.rulerUnits = Units.PIXELS;

  try {
    progress("build icon");
    var iconDoc = buildIcon(1024);
    progress("save icon psd");
    savePsd(iconDoc, OUT.fsName + "/summer-app-icon.psd");
    progress("export icon 1024");
    exportPng(iconDoc, OUT.fsName + "/summer-app-icon-1024.png");
    progress("export icon sizes");
    exportIconSizes(iconDoc);
    iconDoc.close(SaveOptions.DONOTSAVECHANGES);

    progress("build splash");
    var splashDoc = buildSplash(1242, 2688);
    progress("save splash psd");
    savePsd(splashDoc, OUT.fsName + "/summer-launch-1242x2688.psd");
    progress("export splash base");
    exportPng(splashDoc, SPLASH.fsName + "/summer-launch-1242x2688.png");
    progress("export splash sizes");
    exportSplashSizes(splashDoc);
    splashDoc.close(SaveOptions.DONOTSAVECHANGES);

    var log = new File(OUT.fsName + "/photoshop-export.log");
    log.open("w");
    log.encoding = "UTF8";
    log.write("Summer assets exported to:\n" + OUT.fsName + "\n");
    log.close();
  } finally {
    app.preferences.rulerUnits = previousUnits;
  }

  function progress(message) {
    var file = new File(OUT.fsName + "/photoshop-progress.log");
    file.encoding = "UTF8";
    file.open("a");
    file.write((new Date()).toString() + " - " + message + "\n");
    file.close();
  }

  function buildIcon(size) {
    var doc = app.documents.add(size, size, 144, "Summer App Icon", NewDocumentMode.RGB, DocumentFill.TRANSPARENT);

    fillRect(doc, 0, 0, size, size, color(COLORS.deepSea), "deep sea base");
    fillEllipse(doc, -120, -80, 760, 760, color(COLORS.sea), 35, "soft ocean glow");
    fillEllipse(doc, 430, 500, 820, 820, color(COLORS.coral), 32, "sunset coral glow");
    fillEllipse(doc, 640, 90, 320, 320, color(COLORS.lemon), 72, "summer sun");

    drawWaveBand(doc, size);
    drawVinyl(doc, size);
    drawMusicNote(doc, size);
    drawSparkles(doc, size);

    addText(doc, "夏日", size * 0.5, size * 0.81, Math.round(size * 0.073), COLORS.white, "center", "brand cn");
    addText(doc, "BEATS", size * 0.5, size * 0.875, Math.round(size * 0.035), COLORS.mint, "center", "brand en");

    return doc;
  }

  function buildSplash(width, height) {
    var doc = app.documents.add(width, height, 144, "Summer Launch Image", NewDocumentMode.RGB, DocumentFill.TRANSPARENT);

    fillRect(doc, 0, 0, width, height, color(COLORS.deepSea), "deep sea base");
    fillEllipse(doc, -420, -240, 1120, 1120, color(COLORS.sea), 32, "top ocean glow");
    fillEllipse(doc, width - 460, height - 900, 900, 900, color(COLORS.coral), 30, "bottom coral glow");
    fillEllipse(doc, width - 290, 280, 230, 230, color(COLORS.lemon), 82, "sun");

    drawSplashWaves(doc, width, height);
    drawSplashDisc(doc, width, height);
    drawFloatingBubbles(doc, width, height);

    addText(doc, "夏日律动", width * 0.5, height * 0.27, 112, COLORS.white, "center", "launch title");
    addText(doc, "SUMMER · BEATS", width * 0.5, height * 0.325, 34, COLORS.mint, "center", "launch subtitle");
    addText(doc, "让每一阵海风都有旋律", width * 0.5, height * 0.745, 38, COLORS.white, "center", "launch tagline");

    return doc;
  }

  function exportIconSizes(sourceDoc) {
    var sizes = [
      ["android-hdpi", 72],
      ["android-xhdpi", 96],
      ["android-xxhdpi", 144],
      ["android-xxxhdpi", 192],
      ["ios-60@2x", 120],
      ["ios-60@3x", 180],
      ["app-store", 1024]
    ];
    for (var i = 0; i < sizes.length; i++) {
      var tmp = sourceDoc.duplicate("summer-icon-" + sizes[i][0], true);
      tmp.resizeImage(UnitValue(sizes[i][1], "px"), UnitValue(sizes[i][1], "px"), 144, ResampleMethod.BICUBICSHARPER);
      exportPng(tmp, ICONS.fsName + "/summer-icon-" + sizes[i][0] + ".png");
      tmp.close(SaveOptions.DONOTSAVECHANGES);
    }
  }

  function exportSplashSizes(sourceDoc) {
    var sizes = [
      ["android-1080x1920", 1080, 1920],
      ["android-1440x2560", 1440, 2560],
      ["ios-1242x2208", 1242, 2208],
      ["ios-1125x2436", 1125, 2436],
      ["ios-1242x2688", 1242, 2688]
    ];
    for (var i = 0; i < sizes.length; i++) {
      var tmp = sourceDoc.duplicate("summer-launch-" + sizes[i][0], true);
      cropToAspect(tmp, sizes[i][1], sizes[i][2]);
      tmp.resizeImage(UnitValue(sizes[i][1], "px"), UnitValue(sizes[i][2], "px"), 144, ResampleMethod.BICUBICSHARPER);
      exportPng(tmp, SPLASH.fsName + "/summer-launch-" + sizes[i][0] + ".png");
      tmp.close(SaveOptions.DONOTSAVECHANGES);
    }
  }

  function drawWaveBand(doc, size) {
    var mint = color(COLORS.mint);
    var white = color(COLORS.white);
    var y = size * 0.59;
    drawSmoothStroke(doc, [
      [size * 0.13, y],
      [size * 0.27, y - size * 0.055],
      [size * 0.42, y],
      [size * 0.57, y + size * 0.055],
      [size * 0.73, y],
      [size * 0.88, y - size * 0.05]
    ], size * 0.035, mint, 82, "main mint wave");
    drawSmoothStroke(doc, [
      [size * 0.18, y + size * 0.085],
      [size * 0.35, y + size * 0.035],
      [size * 0.52, y + size * 0.085],
      [size * 0.70, y + size * 0.14],
      [size * 0.87, y + size * 0.09]
    ], size * 0.022, white, 55, "secondary white wave");
  }

  function drawVinyl(doc, size) {
    var cx = size * 0.5;
    var cy = size * 0.43;
    var r = size * 0.255;
    fillEllipse(doc, cx - r, cy - r, r * 2, r * 2, color(COLORS.ink), 92, "vinyl outer");
    fillEllipse(doc, cx - r * 0.72, cy - r * 0.72, r * 1.44, r * 1.44, color(COLORS.deepSea), 100, "vinyl inner");
    fillEllipse(doc, cx - r * 0.46, cy - r * 0.46, r * 0.92, r * 0.92, color(COLORS.coral), 94, "vinyl label coral");
    fillEllipse(doc, cx - r * 0.19, cy - r * 0.19, r * 0.38, r * 0.38, color(COLORS.lemon), 96, "vinyl label lemon");
    fillEllipse(doc, cx - r * 0.055, cy - r * 0.055, r * 0.11, r * 0.11, color(COLORS.deepSea), 100, "vinyl hole");
    fillEllipse(doc, cx - r * 0.9, cy - r * 0.86, r * 1.8, r * 1.72, color(COLORS.white), 10, "vinyl highlight");
  }

  function drawMusicNote(doc, size) {
    var c = color(COLORS.white);
    var x = size * 0.62;
    var y = size * 0.29;
    drawStroke(doc, [[x, y], [x, y + size * 0.18]], size * 0.026, c, 95, "note stem");
    drawStroke(doc, [[x, y], [x + size * 0.115, y - size * 0.035], [x + size * 0.115, y + size * 0.025]], size * 0.024, c, 95, "note flag");
    fillEllipse(doc, x - size * 0.092, y + size * 0.145, size * 0.11, size * 0.078, c, 95, "note head");
  }

  function drawSparkles(doc, size) {
    fillDiamond(doc, size * 0.22, size * 0.26, size * 0.035, color(COLORS.lemon), 82, "sparkle lemon");
    fillDiamond(doc, size * 0.79, size * 0.46, size * 0.028, color(COLORS.mint), 82, "sparkle mint");
    fillDiamond(doc, size * 0.29, size * 0.74, size * 0.023, color(COLORS.white), 60, "sparkle white");
  }

  function drawSplashDisc(doc, width, height) {
    var cx = width * 0.5;
    var cy = height * 0.48;
    var r = width * 0.32;
    fillEllipse(doc, cx - r, cy - r, r * 2, r * 2, color(COLORS.ink), 88, "launch vinyl outer");
    fillEllipse(doc, cx - r * 0.74, cy - r * 0.74, r * 1.48, r * 1.48, color(COLORS.deepSea), 100, "launch vinyl inner");
    fillEllipse(doc, cx - r * 0.47, cy - r * 0.47, r * 0.94, r * 0.94, color(COLORS.coral), 94, "launch label");
    fillEllipse(doc, cx - r * 0.18, cy - r * 0.18, r * 0.36, r * 0.36, color(COLORS.lemon), 96, "launch center");
    fillEllipse(doc, cx - r * 0.05, cy - r * 0.05, r * 0.1, r * 0.1, color(COLORS.deepSea), 100, "launch hole");
    drawSmoothStroke(doc, [
      [width * 0.21, cy + r * 0.54],
      [width * 0.36, cy + r * 0.45],
      [width * 0.50, cy + r * 0.54],
      [width * 0.66, cy + r * 0.65],
      [width * 0.82, cy + r * 0.53]
    ], 32, color(COLORS.mint), 78, "launch disc wave");
  }

  function drawSplashWaves(doc, width, height) {
    drawSmoothStroke(doc, [
      [width * 0.05, height * 0.83],
      [width * 0.23, height * 0.79],
      [width * 0.40, height * 0.83],
      [width * 0.59, height * 0.88],
      [width * 0.77, height * 0.83],
      [width * 0.96, height * 0.78]
    ], 42, color(COLORS.mint), 50, "bottom mint wave");
    drawSmoothStroke(doc, [
      [width * 0.02, height * 0.89],
      [width * 0.20, height * 0.85],
      [width * 0.38, height * 0.89],
      [width * 0.58, height * 0.94],
      [width * 0.78, height * 0.89],
      [width * 0.99, height * 0.84]
    ], 28, color(COLORS.white), 26, "bottom white wave");
  }

  function drawFloatingBubbles(doc, width, height) {
    var bubbles = [
      [0.16, 0.20, 34, 36],
      [0.84, 0.23, 22, 40],
      [0.11, 0.49, 18, 34],
      [0.89, 0.55, 44, 28],
      [0.21, 0.68, 26, 30],
      [0.75, 0.72, 16, 42]
    ];
    for (var i = 0; i < bubbles.length; i++) {
      var b = bubbles[i];
      fillEllipse(doc, width * b[0] - b[2] / 2, height * b[1] - b[2] / 2, b[2], b[2], color(COLORS.mint), b[3], "bubble " + i);
    }
  }

  function drawStroke(doc, points, width, solidColor, opacity, name) {
    var layer = doc.artLayers.add();
    layer.name = name;
    layer.opacity = opacity;
    doc.activeLayer = layer;
    stampPolyline(doc, points, width, solidColor);
  }

  function drawSmoothStroke(doc, points, width, solidColor, opacity, name) {
    var layer = doc.artLayers.add();
    layer.name = name;
    layer.opacity = opacity;
    doc.activeLayer = layer;
    var sampled = sampleSmoothPoints(points, 18);
    stampPolyline(doc, sampled, width, solidColor);
  }

  function makePolyline(doc, name, coords, closed) {
    var points = [];
    for (var i = 0; i < coords.length; i++) {
      var p = new PathPointInfo();
      p.kind = PointKind.CORNERPOINT;
      p.anchor = coords[i];
      p.leftDirection = coords[i];
      p.rightDirection = coords[i];
      points.push(p);
    }
    var spi = new SubPathInfo();
    spi.closed = closed;
    spi.operation = ShapeOperation.SHAPEADD;
    spi.entireSubPath = points;
    return doc.pathItems.add(name, [spi]);
  }

  function makeSmoothPath(doc, name, coords) {
    var points = [];
    for (var i = 0; i < coords.length; i++) {
      var prev = coords[Math.max(0, i - 1)];
      var current = coords[i];
      var next = coords[Math.min(coords.length - 1, i + 1)];
      var tension = 0.22;
      var dx = (next[0] - prev[0]) * tension;
      var dy = (next[1] - prev[1]) * tension;
      var p = new PathPointInfo();
      p.kind = PointKind.SMOOTHPOINT;
      p.anchor = current;
      p.leftDirection = [current[0] - dx, current[1] - dy];
      p.rightDirection = [current[0] + dx, current[1] + dy];
      points.push(p);
    }
    var spi = new SubPathInfo();
    spi.closed = false;
    spi.operation = ShapeOperation.SHAPEADD;
    spi.entireSubPath = points;
    return doc.pathItems.add(name, [spi]);
  }

  function fillRect(doc, x, y, w, h, solidColor, name) {
    var layer = doc.artLayers.add();
    layer.name = name;
    doc.activeLayer = layer;
    doc.selection.select([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
    doc.selection.fill(solidColor, ColorBlendMode.NORMAL, 100, false);
    doc.selection.deselect();
  }

  function fillEllipse(doc, x, y, w, h, solidColor, opacity, name) {
    var layer = doc.artLayers.add();
    layer.name = name;
    layer.opacity = opacity;
    doc.activeLayer = layer;
    fillEllipseOnActiveLayer(doc, x, y, w, h, solidColor, name);
  }

  function fillEllipseOnActiveLayer(doc, x, y, w, h, solidColor, name) {
    var path = makeEllipse(doc, name + " path", x, y, w, h);
    path.makeSelection(0, true, SelectionType.REPLACE);
    doc.selection.fill(solidColor, ColorBlendMode.NORMAL, 100, false);
    doc.selection.deselect();
    path.remove();
  }

  function stampPolyline(doc, points, width, solidColor) {
    var radius = width / 2;
    for (var i = 0; i < points.length - 1; i++) {
      var a = points[i];
      var b = points[i + 1];
      var dx = b[0] - a[0];
      var dy = b[1] - a[1];
      var distance = Math.sqrt(dx * dx + dy * dy);
      var steps = Math.max(2, Math.ceil(distance / Math.max(2, radius * 0.7)));
      for (var j = 0; j <= steps; j++) {
        var t = j / steps;
        var x = a[0] + dx * t;
        var y = a[1] + dy * t;
        fillEllipseOnActiveLayer(doc, x - radius, y - radius, width, width, solidColor, "stroke dot");
      }
    }
  }

  function sampleSmoothPoints(points, stepsPerSegment) {
    var sampled = [];
    for (var i = 0; i < points.length - 1; i++) {
      var p0 = points[Math.max(0, i - 1)];
      var p1 = points[i];
      var p2 = points[i + 1];
      var p3 = points[Math.min(points.length - 1, i + 2)];
      for (var j = 0; j < stepsPerSegment; j++) {
        var t = j / stepsPerSegment;
        sampled.push(catmullRom(p0, p1, p2, p3, t));
      }
    }
    sampled.push(points[points.length - 1]);
    return sampled;
  }

  function catmullRom(p0, p1, p2, p3, t) {
    var t2 = t * t;
    var t3 = t2 * t;
    return [
      0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
      0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
    ];
  }

  function fillDiamond(doc, cx, cy, r, solidColor, opacity, name) {
    var layer = doc.artLayers.add();
    layer.name = name;
    layer.opacity = opacity;
    doc.activeLayer = layer;
    doc.selection.select([[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]]);
    doc.selection.fill(solidColor, ColorBlendMode.NORMAL, 100, false);
    doc.selection.deselect();
  }

  function makeEllipse(doc, name, x, y, w, h) {
    var k = 0.5522847498;
    var cx = x + w / 2;
    var cy = y + h / 2;
    var rx = w / 2;
    var ry = h / 2;
    var raw = [
      [[cx, y], [cx - rx * k, y], [cx + rx * k, y]],
      [[x + w, cy], [x + w, cy - ry * k], [x + w, cy + ry * k]],
      [[cx, y + h], [cx + rx * k, y + h], [cx - rx * k, y + h]],
      [[x, cy], [x, cy + ry * k], [x, cy - ry * k]]
    ];
    var points = [];
    for (var i = 0; i < raw.length; i++) {
      var p = new PathPointInfo();
      p.kind = PointKind.SMOOTHPOINT;
      p.anchor = raw[i][0];
      p.leftDirection = raw[i][1];
      p.rightDirection = raw[i][2];
      points.push(p);
    }
    var spi = new SubPathInfo();
    spi.closed = true;
    spi.operation = ShapeOperation.SHAPEADD;
    spi.entireSubPath = points;
    return doc.pathItems.add(name, [spi]);
  }

  function addText(doc, text, x, y, size, hex, justification, name) {
    var layer = doc.artLayers.add();
    layer.kind = LayerKind.TEXT;
    layer.name = name;
    doc.activeLayer = layer;
    var item = layer.textItem;
    item.contents = text;
    item.size = UnitValue(size, "px");
    item.color = color(hex);
    item.position = [x, y];
    item.justification = justification === "center" ? Justification.CENTER : Justification.LEFT;
    try {
      item.font = text.match(/[一-龥]/) ? "MicrosoftYaHei-Bold" : "Arial-BoldMT";
    } catch (e) {
      // Keep Photoshop default if the named font is unavailable.
    }
  }

  function cropToAspect(doc, targetW, targetH) {
    var currentW = doc.width.as("px");
    var currentH = doc.height.as("px");
    var targetRatio = targetW / targetH;
    var currentRatio = currentW / currentH;
    if (Math.abs(targetRatio - currentRatio) < 0.0001) return;
    if (currentRatio > targetRatio) {
      var newW = currentH * targetRatio;
      var left = (currentW - newW) / 2;
      doc.crop([left, 0, left + newW, currentH]);
    } else {
      var newH = currentW / targetRatio;
      var top = (currentH - newH) / 2;
      doc.crop([0, top, currentW, top + newH]);
    }
  }

  function exportPng(doc, path) {
    var file = new File(path);
    var options = new ExportOptionsSaveForWeb();
    options.format = SaveDocumentType.PNG;
    options.PNG8 = false;
    options.transparency = true;
    options.interlaced = false;
    options.quality = 100;
    doc.exportDocument(file, ExportType.SAVEFORWEB, options);
  }

  function savePsd(doc, path) {
    var file = new File(path);
    var options = new PhotoshopSaveOptions();
    options.layers = true;
    doc.saveAs(file, options, true, Extension.LOWERCASE);
  }

  function color(hex) {
    var c = new SolidColor();
    c.rgb.hexValue = hex;
    return c;
  }

  function ensureFolder(folder) {
    if (!folder.exists) folder.create();
  }
  }
})();
