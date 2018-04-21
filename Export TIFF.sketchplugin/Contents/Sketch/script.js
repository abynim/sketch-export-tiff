var onRun = function(context) {
	
	var selection = context.selection;
	if(selection.count() == 0) {
		NSApp.displayDialog_withTitle("Select a layer to export", "Nothing selected");
		return;
	}
	
	var savePanel = NSSavePanel.savePanel();
	savePanel.setAllowsOtherFileTypes(false);
	savePanel.setExtensionHidden(false);
	savePanel.setCanCreateDirectories(true);
	savePanel.setNameFieldStringValue(sanitizeFilename(selection.firstObject().name()));
	savePanel.setTitle("Select the destination folder");
	
    var settingsAccessoryView = NSView.alloc().initWithFrame(CGRectMake(0,0,220,50));
	var resLabel = NSTextField.alloc().initWithFrame(CGRectMake(0,9,80,23));
	resLabel.setDrawsBackground(false);
	resLabel.setBordered(false);
	resLabel.setStringValue("Resolutions:");
	resLabel.setAlignment(NSRightTextAlignment);
	resLabel.setEditable(false);
	settingsAccessoryView.addSubview(resLabel);
	
	var res1Button = NSButton.alloc().initWithFrame(NSMakeRect(90,12,40, 23));
	res1Button.title = "1x";
	res1Button.state = NSOnState;
	res1Button.setEnabled(0);
	res1Button.setButtonType(NSSwitchButton);
	res1Button.setBezelStyle(0);
	settingsAccessoryView.addSubview(res1Button);
	
	var res2Button = NSButton.alloc().initWithFrame(NSMakeRect(130,12,40, 23));
	res2Button.title = "2x";
	res2Button.state = NSOnState;
	res2Button.setButtonType(NSSwitchButton);
	res2Button.setBezelStyle(0);
	settingsAccessoryView.addSubview(res2Button);
	
	var res3Button = NSButton.alloc().initWithFrame(NSMakeRect(170,12,40, 23));
	res3Button.title = "3x";
	res3Button.state = NSOffState;
	res3Button.setButtonType(NSSwitchButton);
	res3Button.setBezelStyle(0);
	settingsAccessoryView.addSubview(res3Button);
	
	savePanel.setAccessoryView(settingsAccessoryView);
	
	var response = savePanel.runModal();
	if (response == NSOKButton) {
		
		var doc = context.document,
			saveToFolder = savePanel.URL().path().stringByDeletingLastPathComponent(),
			loop = selection.objectEnumerator(),
			resolutions = [],
			fileManager = NSFileManager.defaultManager(),
			pluginDomain = context.plugin.identifier(),
			tempFolderPath = fileManager.URLsForDirectory_inDomains(NSCachesDirectory, NSUserDomainMask).lastObject().URLByAppendingPathComponent(pluginDomain).URLByAppendingPathComponent("temp-images").path(),
			layer, ogLayer, exportSize, scale, rect, imagePath, slice, path, res, pngImage, pngRep, pngRepSize, request, layerName, tiffImage, tiffRep;

		fileManager.createDirectoryAtPath_withIntermediateDirectories_attributes_error(tempFolderPath, true, nil, nil);
		
		if(res1Button.state() == NSOnState) resolutions.push("1x");
		if(res2Button.state() == NSOnState) resolutions.push("2x");
		if(res3Button.state() == NSOnState) resolutions.push("3x");
		
		while(ogLayer = loop.nextObject()) {

			layer = ogLayer.duplicate();
			layerName = sanitizeFilename(ogLayer.name());
			
			tiffImage = NSImage.alloc().init();
			
			var cnt = resolutions.length;
			for (var i=0; i < cnt; i++) {
				res = resolutions[i];
				
				slice = MSExportRequest.alloc().init();
				rect = layer.absoluteRect().rect();
				scale = parseFloat(res);

				slice.setRect(rect)
				slice.setScale(scale)
				slice.setShouldTrim(0)
				slice.setSaveForWeb(1)
				slice.setName(layerName + res)
				slice.setFormat("png")
				
				path = tempFolderPath.stringByAppendingPathComponent(layerName + res).stringByAppendingPathExtension("png");
				doc.saveArtboardOrSlice_toFile(slice, path);
				
				pngImage = NSImage.alloc().initWithContentsOfFile(path);
				pngRep = NSBitmapImageRep.imageRepWithData(pngImage.TIFFRepresentation());
				
				if(scale == 1.0) pngRepSize = pngRep.size();
				pngRep.setSize(pngRepSize);
				
				tiffImage.addRepresentation(pngRep);
			}

			layer.removeFromParent();
			
			tiffRep = tiffImage.TIFFRepresentation();
			imagePath = saveToFolder.stringByAppendingPathComponent(layerName).stringByAppendingPathExtension("tiff");
			tiffRep.writeToFile_options_error(imagePath, 0, nil);
			
		}
		
		var numLayers = selection.count();
		doc.showMessage(numLayers + " images exported.");
				
	}
};

var sanitizeFilename = function(layerName) {
	var charsToRemove = NSCharacterSet.characterSetWithCharactersInString("/\\?%*|<>:' ,");
	var quotesToRemove = NSCharacterSet.characterSetWithCharactersInString('"');
	var dotsToRemove = NSCharacterSet.characterSetWithCharactersInString(".");
	var cleanFilename = layerName.componentsSeparatedByCharactersInSet(charsToRemove).componentsJoinedByString("");
	cleanFilename = cleanFilename.componentsSeparatedByCharactersInSet(quotesToRemove).componentsJoinedByString("");
	return cleanFilename.stringByTrimmingCharactersInSet(dotsToRemove);
}

