import { useRef, useState, useEffect, useCallback } from "react";

const CLOUD_NAME = "dntwulwaj"; 
const UPLOAD_PRESET = "rivora_preset"; 

const useLocalRecording = (sessionId, userRole) => {

  const mediaStreamRef = useRef(null); 
  const [isRecording, setIsRecording] = useState(false); 
  const recordingActiveRef = useRef(false); 
  const chunkCounterRef = useRef(0);
  const [uploadedChunkUrls, setUploadedChunkUrls] = useState([]); 
  const currentRecorderRef = useRef(null); 
  const [isUploading, setIsUploading] = useState(false); 
  const [uploadProgress, setUploadProgress] = useState(0);

  const recordChunk = useCallback(async () => {
    if (!recordingActiveRef.current || !mediaStreamRef.current) {
      return;
    }

    const currentChunkNum = chunkCounterRef.current++; 

    let recorder;
    try {
      recorder = new MediaRecorder(mediaStreamRef.current, {
        mimeType: "video/webm;codecs=vp8,opus",
      });
      currentRecorderRef.current = recorder; 
    } catch (error) {
      console.error(`[${userRole}] Failed to create MediaRecorder for chunk ${currentChunkNum}:`, error);

      recordingActiveRef.current = false;
      setIsRecording(false);

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      currentRecorderRef.current = null; 
      return;
    }

    const chunks = []; 

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorder.onstop = async () => { 
      const blob = new Blob(chunks, { type: recorder.mimeType }); 

      if (currentRecorderRef.current === recorder) {
        currentRecorderRef.current = null;
      }

      if (blob.size === 0) {
        console.warn(`[${userRole}] Chunk ${currentChunkNum} is empty, skipping upload.`);

        if (recordingActiveRef.current) {
          setTimeout(recordChunk, 100);
        } else {
          console.log(`[${userRole}] Recording loop explicitly ended by stopRecording call.`);
        }
        return;
      }

      setIsUploading(true); 
      setUploadProgress(0); 

      const formData = new FormData();
      formData.append("file", blob);
      formData.append("upload_preset", UPLOAD_PRESET);
      formData.append("resource_type", "video");

      const publicId = `${sessionId}/${userRole}/chunk-${currentChunkNum}-${Date.now()}`;
      formData.append("public_id", publicId);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`);

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded * 100) / event.total);
          setUploadProgress(percentComplete);
        }
      });

      xhr.onload = () => {
        setIsUploading(false); 
        setUploadProgress(0); 
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText);
          setUploadedChunkUrls((prev) => [...prev, data.secure_url]); 
        } else {
          const errorData = JSON.parse(xhr.responseText);
          console.error(
            `[${userRole}] Upload failed for chunk ${currentChunkNum} (Status: ${xhr.status}):`,
            errorData.error?.message || xhr.statusText,
            errorData
          );
        }
      };

      xhr.onerror = () => {
        setIsUploading(false); 
        setUploadProgress(0); 
      };

      xhr.send(formData); 

      if (recordingActiveRef.current) {
        setTimeout(recordChunk, 100); 
      } else {
        console.log(`[${userRole}] Recording loop explicitly ended by stopRecording call.`);
      }
    };

    recorder.start();

    setTimeout(() => {
      if (recorder.state === "recording") { 
        recorder.stop();
      } else {
        console.warn(`[${userRole}] Recorder for chunk ${currentChunkNum} was not in 'recording' state, state was: ${recorder.state}`);
      }
    }, 5000); 
  }, [sessionId, userRole]); 

  const startRecording = useCallback(async () => {
    if (isRecording) {
      console.warn(`[${userRole}] Already recording, skipping start`);
      return;
    }

    try {
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setIsRecording(true); 
      recordingActiveRef.current = true; 
      chunkCounterRef.current = 0; 
      setUploadedChunkUrls([]); 
      setIsUploading(false); 
      setUploadProgress(0); 

      recordChunk(); 
    } catch (error) {
      console.error('[${userRole}] Could not start media stream:', error);
      setIsRecording(false); 
      recordingActiveRef.current = false; 
      setIsUploading(false); 
      setUploadProgress(0); 

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
    }
  }, [isRecording, recordChunk, userRole]); 

  const stopRecording = useCallback(() => {
    if (!recordingActiveRef.current) { 
      console.warn('[${userRole}] No recording in progress to stop');
      return;
    }

    setIsRecording(false); 
    recordingActiveRef.current = false; 

    if (currentRecorderRef.current && currentRecorderRef.current.state === "recording") {
      currentRecorderRef.current.stop();
      currentRecorderRef.current = null; 
    } else {
      console.log('[${userRole}] No active MediaRecorder instance to stop immediately.');
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, [userRole]);

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (currentRecorderRef.current && currentRecorderRef.current.state === "recording") {
        currentRecorderRef.current.stop(); 
      }
      currentRecorderRef.current = null; 
      recordingActiveRef.current = false; 
      setIsRecording(false); 
      setIsUploading(false); 
      setUploadProgress(0); 
    };
  }, [userRole]); 

  return {
    startRecording,
    stopRecording,
    isRecording,
    isUploading, 
    uploadProgress, 
    uploadedChunkUrls,
  };
}

export default useLocalRecording;