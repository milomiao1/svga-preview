import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Player, Parser } from 'svga.lite';

const SvgaPreview = () => {
  const [fileUrl, setFileUrl] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileList, setFileList] = useState([]);
  const [filteredFileList, setFilteredFileList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [svgaInfo, setSvgaInfo] = useState(null);
  const canvasRef = useRef(null);
  const playerRef = useRef(null);
  const dropRef = useRef(null);
  const [scaleFactor, setScaleFactor] = useState(-1);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
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
      setFilteredFileList(files);
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

  const handleSearchChange = (event) => {
    const query = event.target.value.toLowerCase();
    setSearchQuery(query);
    const filteredFiles = fileList.filter(fileHandle =>
      fileHandle.name.toLowerCase().includes(query)
    );
    setFilteredFileList(filteredFiles);
  };

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.name.endsWith('.svga')) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      setFileName(file.name);
      resetState();
    }
  }, []);

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const resetState = () => {
    setCanvasSize({ width: 0, height: 0 });
    setSvgaInfo(null);
    setScaleFactor(-1)

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
      renderSvga(fileUrl);
    }
  }, [fileUrl]);

  useEffect(() => {
    const dropArea = dropRef.current;
    if (dropArea) {
      dropArea.addEventListener('dragover', handleDragOver);
      dropArea.addEventListener('drop', handleDrop);
    }

    return () => {
      if (dropArea) {
        dropArea.removeEventListener('dragover', handleDragOver);
        dropArea.removeEventListener('drop', handleDrop);
      }
    };
  }, [handleDrop]);

  const calculateScaledDimensions2 = (width, height) => {

    let scaleFactor = 1;

    const maxDimension = Math.max(width, height);

    // 根据缩放范围调整 scaleFactor
    if (maxDimension < 150) {
      scaleFactor = 2;
    } else if (maxDimension > 375) {
      scaleFactor = 0.5;
    }

    // 限制 scaleFactor 在 0.5 到 2 之间
    scaleFactor = Math.max(0.5, Math.min(scaleFactor, 2));
    console.log("scale factor get", scaleFactor)
    setScaleFactor(scaleFactor)

    return {
      width: width * scaleFactor,
      height: height * scaleFactor
    };
  };

  const calculateScaledDimensions = (width, height) => {
    if ((width === 0) || (height === 0)) {
      return {width, height}
    }
    if (scaleFactor === -1) {
      console.log("scale factor", scaleFactor, width, height)
      return calculateScaledDimensions2(width, height)
    }

      console.log("scale factor next: ", scaleFactor)
    const scaledWidth = width * scaleFactor;
    const scaledHeight = height * scaleFactor;

    return {
      width: scaledWidth,
      height: scaledHeight
    };
  };

  // 在渲染部分使用
  const scaledDimensions = calculateScaledDimensions(canvasSize.width, canvasSize.height);

  return (
    <div className="container">
      <div className="div1">
        {/* Left section: File input, directory selection and search */}
        <div>
          <input type="file" accept=".svga" onChange={handleFileChange} />
        </div>
        <div>
          <button onClick={handleDirectoryChange}>Select Directory</button>
        </div>
        <div>
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={handleSearchChange}
            style={{ width: '100%', padding: '5px', marginTop: '10px' }}
          />
        </div>
        <div>
          {filteredFileList.map((fileHandle, index) => (
            <div key={index} onClick={() => handleFileClick(fileHandle)} style={{ cursor: 'pointer', padding: '5px', borderBottom: '1px solid #ccc' }}>
              {fileHandle.name}
            </div>
          ))}
        </div>
      </div>
      <div className="div2" ref={dropRef}>
        <div className="preview-info-container">
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
          <div className="canvas-container">
            {fileUrl ? (
              <div>
                <label>Scale Factor: {scaleFactor.toFixed(1)}</label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={scaleFactor}
                  onChange={(e) => setScaleFactor(parseFloat(e.target.value))}
                  style={{ width: '100%', marginTop: '10px' }}
                />
                <canvas
                  ref={canvasRef}
                  width={canvasSize.width}
                  height={canvasSize.height}
                  style={{
                    width: `${scaledDimensions.width}px`,
                    height: `${scaledDimensions.height}px`
                  }}
                />
              </div>
            ) : (
              <div className="drop-zone">
                Drag and drop an SVGA file here to preview
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SvgaPreview;
