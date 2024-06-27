import React, { useState, useRef, useEffect } from 'react';
import { Player, Parser } from 'svga.lite';

const SvgaPreview = () => {
  const [fileUrl, setFileUrl] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileList, setFileList] = useState([]);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [svgaInfo, setSvgaInfo] = useState(null);
  const canvasRef = useRef(null);
  const playerRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      console.log("Selected file path:", file.path);
      console.log("Generated file URL:", url);

      setFileUrl(url);
      setFileName(file.name);
      resetState();
    }
  };

  const handleDirectoryChange = async () => {
    try {
      const dirHandle = await window.showDirectoryPicker();
      const files = [];
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.svga')) {
          files.push(entry);
        }
      }
      setFileList(files);
    } catch (error) {
      console.error("Error accessing directory:", error);
    }
  };

  const handleFileClick = async (fileHandle) => {
    try {
      const file = await fileHandle.getFile();
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      setFileName(fileHandle.name);
      resetState();
    } catch (error) {
      console.error("Error reading file:", error);
    }
  };

  const resetState = () => {
    setCanvasSize({ width: 0, height: 0 });
    setSvgaInfo(null);

    if (canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    if (playerRef.current) {
      playerRef.current.stop();
      playerRef.current.clear();
    }
  };

  useEffect(() => {
    const renderSvga = async (url) => {
      if (!canvasRef.current) return;

      const player = new Player(canvasRef.current);
      const parser = new Parser();
      playerRef.current = player;

      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const videoItem = await parser.do(arrayBuffer);
        console.log("Video item loaded:", videoItem);

        const { videoSize } = videoItem;

        setCanvasSize({
          width: videoSize.width,
          height: videoSize.height
        });

        setSvgaInfo({
          width: videoSize.width,
          height: videoSize.height,
          frames: videoItem.frames,
          FPS: videoItem.FPS,
        });

        await player.mount(videoItem);

        setTimeout(() => {
          player.start();
        }, 0);
      } catch (error) {
        console.error("Error loading SVGA file:", error);
      }
    };

    if (fileUrl) {
      console.log("Rendering SVGA with URL:", fileUrl);
      renderSvga(fileUrl);
    }
  }, [fileUrl]);

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Left section: File input and directory selection */}
      <div style={{ width: '200px', borderRight: '1px solid #ccc', padding: '10px', overflowY: 'auto' }}>
        <div>
          <input type="file" accept=".svga" onChange={handleFileChange} />
        </div>
        <div>
          <button onClick={handleDirectoryChange}>Select Directory</button>
        </div>
        <div>
          {fileList.map((fileHandle, index) => (
            <div key={index} onClick={() => handleFileClick(fileHandle)} style={{ cursor: 'pointer', padding: '5px', borderBottom: '1px solid #ccc' }}>
              {fileHandle.name}
            </div>
          ))}
        </div>
      </div>

      {/* Middle section: SVGA information and preview */}
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <div style={{ marginBottom: '20px', whiteSpace: 'nowrap' }}>
          {fileUrl && svgaInfo && (
            <div className="list-container">
              <p>File Name: {fileName}</p>
              <p>Information:</p>
              <ul>
                <li>Width: {svgaInfo.width}px</li>
                <li>Height: {svgaInfo.height}px</li>
                <li>Frames: {svgaInfo.frames}</li>
                <li>FPS: {svgaInfo.FPS}</li>
              </ul>
            </div>
          )}
        </div>
        <div>
          {fileUrl && (
            <canvas
              ref={canvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              style={{
                width: canvasSize.width > 150 ? canvasSize.width : canvasSize.width * 2,
                height: canvasSize.height > 150 ? canvasSize.height : canvasSize.height * 2
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SvgaPreview;
