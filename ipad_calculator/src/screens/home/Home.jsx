import React, { useEffect, useRef, useState } from "react";
import { SWATCHES } from "../../constants";
import { ColorSwatch, Group } from "@mantine/core";
import axios from "axios";
import Draggable from "react-draggable";
import { Button } from "@/components/ui/button";

function Home() {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("rgb(255,255,255)");
  const [reset, setReset] = useState(false);
  // const [result, setResult] = useState({ expression: '', answer: '' });
  const [result, setResult] = useState(null);
  const [latexExpression, setLatexExpression] = useState([]);
  const [latexPosition, setLatexPosition] = useState({ x: 10, y: 200 });
  const [dictOfVars, setDictOfVars] = useState({});

  useEffect(() => {
    if (latexExpression.length > 0 && window.MathJax) {
        setTimeout(() => {
            window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
        }, 0);
    }
}, [latexExpression]);

  useEffect(() => {
    if (result) {
      renderLatexToCanvas(result.expression, result.answer);
    }
  }, [result]);


  useEffect(() => {
    if (reset) {
      resetCanvas();
      setLatexExpression([]);
      setResult(undefined);
      setDictOfVars({});
      setReset(false);
    }
  }, [reset]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Set the canvas size
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Set default styles
        ctx.lineCap = "round"; // Correct property setting
        ctx.lineWidth = 3;

        // Set the default background to black
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML";
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      window.MathJax.Hub.Config({
        tex2jax: {
          inlineMath: [
            ["$", "$"],
            ["\\(", "\\)"],
          ],
        },
      });
    };

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const sendData = async () => {
    const canvas = canvasRef.current;
  
    if (canvas) {
      try {
        const response = await axios({
          method: 'post',
          url: `${import.meta.env.VITE_API_URL}/calculate`,
          data: {
            image: canvas.toDataURL('image/png'),
            dict_of_vars: dictOfVars
          }
        });
  
        const resp = response.data;
        console.log('Response', resp);
  
        // Update the dict_of_vars based on the response
        resp.data.forEach((data) => {
          if (data.assign === true) {
            setDictOfVars((prevVars) => ({
              ...prevVars,
              [data.expr]: data.result
            }));
          }
        });
  
        // Get the canvas context
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          let minX = canvas.width,
            minY = canvas.height,
            maxX = 0,
            maxY = 0;
  
          // Loop through canvas pixels to find the non-transparent pixel boundaries
          for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
              const i = (y * canvas.width + x) * 4;
              if (imageData.data[i + 3] > 0) {
                // If pixel is not transparent
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
              }
            }
          }
  
          // Calculate center of non-transparent area
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;
  
          setLatexPosition({ x: centerX, y: centerY });
  
          // Set result with a delay
          resp.data.forEach((data) => {
            setTimeout(() => {
              setResult({
                expression: data.expr,
                answer: data.result
              });
            }, 1000);
          });
        }
      } catch (error) {
        console.error('Error sending data:', error);
      }
    }
  };
  


  const renderLatexToCanvas = (expression, answer) => {
    const latex = `\\(\\LARGE{${expression} = ${answer}}\\)`;
    setLatexExpression([...latexExpression, latex]);

    // Clear the main canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  };


  const resetCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Clear the canvas and reset background to black
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    canvas.style.backgroud = "black";
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY); // Correct property access
        setIsDrawing(true);
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const draw = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = color;
        ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY); // Correct property access
        ctx.stroke();
      }
    }
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <Button
          onClick={() => setReset(true)}
          className="z-20 bg-black text-white"
          variant="default"
          color="black"
        >
          Reset
        </Button>
        <Group className="z-20">
          {SWATCHES.map((swatchColor) => (
            <ColorSwatch
              key={swatchColor}
              color={swatchColor}
              onClick={() => setColor(swatchColor)}
              className="cursor-pointer"
            />
          ))}
        </Group>
        <Button
          onClick={sendData}
          className="z-20 bg-black text-white"
          variant="default"
          color="black"
        >
          Calculate
        </Button>
      </div>

      <div>
        <Button className="bg-black">Run</Button>
      </div>
      <canvas
        ref={canvasRef}
        id="canvas"
        className="absolute top-0 left-0 w-full h-full"
        onMouseDown={startDrawing}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
        onMouseMove={draw}
      />
      {latexExpression && latexExpression.map((latex, index) => (
                <Draggable
                    key={index}
                    defaultPosition={latexPosition}
                    onStop={(e, data) => setLatexPosition({ x: data.x, y: data.y })}
                >
                    <div className="absolute p-2 text-white rounded shadow-md">
                        <div className="latex-content">{latex}</div>
                    </div>
                </Draggable>
            ))}
    </>
  );
}

export default Home;
