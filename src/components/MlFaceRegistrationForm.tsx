/**
 * src/components/MlFaceRegistrationForm.tsx
 *
 * -> form component untuk registrasi wajah ml (InsightFace)
 *      -> pengambilan 3 sudut foto wajah (lurus, kiri, kanan) secara interaktif
 *      -> overlay dinamis berbasis SVG siluet cermin-web
 *      -> integrasi mini-icon panduan pose wajah
 * -> disini diatur perizinan webcam stream, capture canvas, dan upload FormData
 */

import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Camera, Upload, AlertCircle, CheckCircle, RefreshCw, X, RotateCcw, Image as ImageIcon } from 'lucide-react';

interface UserData {
  id: number;
  name: string;
  role: 'admin' | 'staff' | 'student' | 'guest';
}

interface MlFaceRegistrationFormProps {
  user: UserData;
  token: string;
  onBack: () => void;
  onSuccess: () => void;
}

export default function MlFaceRegistrationForm({ user, token, onBack, onSuccess }: MlFaceRegistrationFormProps) {
  const [photo1, setPhoto1] = useState<string | null>(null); // Straight
  const [photo2, setPhoto2] = useState<string | null>(null); // Left
  const [photo3, setPhoto3] = useState<string | null>(null); // Right

  // File objects for fallback uploads
  const [photo1File, setPhoto1File] = useState<File | null>(null);
  const [photo2File, setPhoto2File] = useState<File | null>(null);
  const [photo3File, setPhoto3File] = useState<File | null>(null);

  const [activeCaptureSlot, setActiveCaptureSlot] = useState<1 | 2 | 3>(1);
  const [isCameraStarted, setIsCameraStarted] = useState(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://smart-room-access-backend-196827089960.asia-southeast2.run.app';

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // helper --------------------------------------------------------------------------

  // function untuk menghentikan stream kamera webcam
  // input param : none
  // output : void
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraStarted(false);
  };

  // function untuk mengaktifkan stream webcam ke monitor utama
  // input param : none
  // output : void
  const startWebcam = async () => {
    setCameraError('');
    
    // validasi ketersediaan mediaDevices (terutama untuk non-secure context)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Kamera tidak didukung di browser ini atau koneksi Anda tidak aman (harus menggunakan HTTPS atau localhost).');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 640 },
          aspectRatio: { ideal: 1 },
          facingMode: 'user'
        },
        audio: false
      });
      
      streamRef.current = stream;
      setIsCameraStarted(true);
      
      // Tunggu render video element selesai, lalu pasang streamObject
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(err => {
            console.error('Video play error:', err);
          });
        }
      }, 100);
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError('Gagal mengakses kamera. Silakan periksa izin kamera browser atau gunakan file upload di panel sebelah kanan.');
      setIsCameraStarted(false);
    }
  };

  // function untuk menangkap gambar frame dari video stream ke slot aktif saat ini
  // input param : none
  // output : void
  const capturePhoto = () => {
    if (!videoRef.current || !streamRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    
    // Set resolusi canvas 480x480 agar seragam
    const size = 480;
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Crop video stream menjadi bujur sangkar 1:1
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      const minSize = Math.min(videoWidth, videoHeight);
      
      const startX = (videoWidth - minSize) / 2;
      const startY = (videoHeight - minSize) / 2;
      
      // Efek mirror agar preview lurus sesuai pandangan user
      ctx.translate(size, 0);
      ctx.scale(-1, 1);
      
      ctx.drawImage(video, startX, startY, minSize, minSize, 0, 0, size, size);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const photoFile = dataURLtoFile(dataUrl, `face_pose_${activeCaptureSlot}_${user.id}.jpg`);

      // Update state sesuai slot aktif
      if (activeCaptureSlot === 1) {
        setPhoto1(dataUrl);
        setPhoto1File(photoFile);
        // Otomatis pindah ke slot kosong berikutnya
        if (!photo2) {
          setActiveCaptureSlot(2);
        } else if (!photo3) {
          setActiveCaptureSlot(3);
        }
      } else if (activeCaptureSlot === 2) {
        setPhoto2(dataUrl);
        setPhoto2File(photoFile);
        if (!photo3) {
          setActiveCaptureSlot(3);
        } else if (!photo1) {
          setActiveCaptureSlot(1);
        }
      } else if (activeCaptureSlot === 3) {
        setPhoto3(dataUrl);
        setPhoto3File(photoFile);
        if (!photo1) {
          setActiveCaptureSlot(1);
        } else if (!photo2) {
          setActiveCaptureSlot(2);
        }
      }
    }
  };

  // function untuk konversi base64 dataURL ke objek File
  // input param : dataurl -> string, filename -> string
  // output : File object
  const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  // function untuk meng-handle upload file secara manual (fallback)
  // input param : file -> File, slot -> 1 | 2 | 3
  // output : void
  const handleFileUpload = (file: File | null, slot: 1 | 2 | 3) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      if (slot === 1) {
        setPhoto1(dataUrl);
        setPhoto1File(file);
      } else if (slot === 2) {
        setPhoto2(dataUrl);
        setPhoto2File(file);
      } else if (slot === 3) {
        setPhoto3(dataUrl);
        setPhoto3File(file);
      }
    };
    reader.readAsDataURL(file);
  };

  // function untuk mereset foto yang sudah terambil
  // input param : slot -> 1 | 2 | 3
  // output : void
  const resetPhoto = (slot: 1 | 2 | 3) => {
    if (slot === 1) {
      setPhoto1(null);
      setPhoto1File(null);
    } else if (slot === 2) {
      setPhoto2(null);
      setPhoto2File(null);
    } else if (slot === 3) {
      setPhoto3(null);
      setPhoto3File(null);
    }
  };

  // function untuk menyimpan pendaftaran wajah ke backend ML
  // input param : e -> form event
  // output : void
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!photo1File || !photo2File || !photo3File) {
      return setErrorMsg('Wajib mengambil/mengupload ketiga pose foto (lurus, kiri, kanan) sebelum menyimpan.');
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('person_name', user.name);
      formData.append('user_id', String(user.id));
      formData.append('photo_1', photo1File);
      formData.append('photo_2', photo2File);
      formData.append('photo_3', photo3File);

      // Simpan URL base64 ke localStorage untuk preview offline lokal
      try {
        const localPhotoKey = `user_photos_${user.id}`;
        const photosArray = [photo1, photo2, photo3];
        localStorage.setItem(localPhotoKey, JSON.stringify(photosArray));
      } catch (e) {
        console.warn('Failed to cache photos locally:', e);
      }

      const res = await fetch(`${API_URL}/api/v1/face/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();

      if (data.success) {
        setSuccessMsg('Registrasi wajah machine learning berhasil disinkronkan!');
        setTimeout(() => {
          stopCamera();
          onSuccess();
        }, 2000);
      } else {
        setErrorMsg(data.message || 'Gagal meregistrasi wajah di ML Service.');
      }
    } catch (err: any) {
      console.error('ML face registration error:', err);
      setErrorMsg('Gagal terhubung dengan server ML. Silakan coba kembali.');
    } finally {
      setIsLoading(false);
    }
  };

  // end of helper ------------------------------------------------------------------

  const getGuideText = () => {
    if (activeCaptureSlot === 1) return 'Pandangan Lurus: Posisikan wajah Anda tepat di tengah kotak/oval dan hadap lurus ke depan.';
    if (activeCaptureSlot === 2) return 'Pandangan Kiri: Palingkan kepala Anda sedikit ke arah kiri Anda.';
    return 'Pandangan Kanan: Palingkan kepala Anda sedikit ke arah kanan Anda.';
  };

  // Me-render SVG overlay wajah high-fidelity dari cermin-web secara dinamis
  // input param : none
  // output      : React.ReactNode (elemen SVG overlay)
  const renderBiometricOverlay = () => {
    if (activeCaptureSlot === 1) {
      // Pose 1: Lurus / Hadap Depan (ViewBox: 0 0 611.28 388.61)
      return (
        <svg 
          className="w-full h-full text-emerald-500/90 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
          viewBox="0 0 611.28 388.61" 
          preserveAspectRatio="xMidYMid slice" 
          fill="none"
        >
          {/* Backdrop mask (cutout) */}
          <path 
            fill="rgba(15, 23, 42, 0.55)" 
            d="M0,0V388.61H98.87a58.3,58.3,0,0,1,42.25-56.05l15.36-4.4L250,300.7c12.18-19.33,9.53-43.61,8.44-50.58C237,223.75,231,204.5,231,187.48v-8.23a260.15,260.15,0,0,0-2.77-41.19,82.39,82.39,0,0,1-1-16.63c1.78-41.56,35.39-75.75,76.92-78.18,1.65-.1,3.29-.13,4.92-.13s3.28,0,4.93.13c41.53,2.43,75.13,36.62,76.92,78.18a82.39,82.39,0,0,1-1,16.63c-2.18,13.6-2.76,27.41-2.76,41.19v8.23c0,17-5.95,36.27-27.44,62.64h0c-1.07,6.87-3.65,30.54,7.92,49.73l88.74,28.31h0l15.35,4.4a58.3,58.3,0,0,1,42.26,56.05h97.19V0Z"
          />
          {/* Glowing Silhouette line */}
          <path 
            stroke="currentColor" 
            strokeWidth="1.8" 
            strokeLinecap="round"
            strokeDasharray="4 4" 
            d="M390.17,122.33c-1.77-41.16-35-75-76.16-77.42-1.64-.09-3.26-.13-4.88-.13s-3.24,0-4.88.13c-41.12,2.41-74.39,36.26-76.16,77.42a82.25,82.25,0,0,0,.95,16.46,257.34,257.34,0,0,1,2.74,40.78v8.16c0,19.27,7.7,41.45,37.35,73.76,11,11.94,22.12,22.45,35.4,22.45,1.58,0,3.11-.09,4.6-.23,1.49.14,3,.23,4.6.23,13.29,0,24.44-10.51,35.4-22.45,29.66-32.31,37.36-54.49,37.36-73.76v-8.16a257.34,257.34,0,0,1,2.74-40.78A81.52,81.52,0,0,0,390.17,122.33Z"
          />
          {/* Biometric crosshairs */}
          <g opacity="0.45">
            <polygon 
              fill="currentColor" 
              points="306.48 39.8 306.64 100.03 306.73 160.25 306.64 220.48 306.6 250.6 306.48 280.71 306.35 250.6 306.31 220.48 306.23 160.25 306.31 100.03 306.48 39.8"
            />
            <path 
              fill="currentColor" 
              d="M228.47,148.44a332.54,332.54,0,0,0,38.75,6.73,343.33,343.33,0,0,0,39.26,2.14,345.75,345.75,0,0,0,39.26-2.14c3.26-.36,6.5-.83,9.75-1.24s6.48-1,9.72-1.54,6.44-1.22,9.67-1.82l9.6-2.13-9.58,2.25c-3.21.64-6.42,1.33-9.65,1.94s-6.47,1.1-9.71,1.58-6.51.92-9.76,1.29a346.37,346.37,0,0,1-39.3,2.31,346.37,346.37,0,0,1-39.3-2.31c-3.25-.44-6.52-.81-9.76-1.29s-6.49-1-9.72-1.6-6.45-1.21-9.65-1.94S231.65,149.23,228.47,148.44Z"
            />
            <polygon 
              fill="currentColor" 
              points="306.5 74.83 306.63 101.92 306.67 129.01 306.75 183.19 306.67 237.37 306.63 264.46 306.5 291.55 306.38 264.46 306.34 237.37 306.25 183.19 306.34 129.01 306.38 101.92 306.5 74.83"
            />
          </g>
        </svg>
      );
    }
    if (activeCaptureSlot === 2) {
      // Pose 2: Hadap Kiri (ViewBox: 0 0 613.5 388.61)
      return (
        <svg 
          className="w-full h-full text-emerald-500/90 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
          viewBox="0 0 613.5 388.61" 
          preserveAspectRatio="xMidYMid slice" 
          fill="none"
        >
          {/* Backdrop mask (cutout) */}
          <path 
            fill="rgba(15, 23, 42, 0.55)" 
            d="M0,0V388.61H99.84a58.3,58.3,0,0,1,42.26-56.05l15.35-4.4h0l.48-.3,89.68-22.57s10.24-19-6-34.87h0c-14.92-6.79-17.9-19.74-27.49-40.4-10.87-23.41-12.2-34-10.25-54.77,1.2-12.68,1.73-42.23,1.73-42.23s0-5.09,0-7.53c0-44.8,37.31-81.11,83.34-81.11s83.33,36.31,83.33,81.11c0,1.25,0,2.5-.09,3.73l.09,0c-3.53,42.23-12.14,57.72-19.33,79a46.29,46.29,0,0,1-8.43,14.43l-.24,2.43s-13.07,42.52,16.19,70.11l96.25,32.91v-1.34l.7,1.34,15.36,4.4a58.3,58.3,0,0,1,42.25,56.05H613.5V0Z"
          />
          {/* Glowing Silhouette line */}
          <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M205.31,129.9a16.44,16.44,0,0,1-.05,2s0,.73,0,2" />
          <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="4 4" d="M205.13,137.89c-.23,9.31-.75,27.13-1.6,36.24-1.95,20.78-.63,31.36,10.24,54.78S227,265.85,247.91,271.7s38.62-2.65,65.38-22.72,35.74-31.24,39.3-41.82c7-20.62,15.26-35.79,19-75" />
          <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M371.75,130.13l.18-2-.1,0c0-.66.06-1.32.07-2" />
          <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="4 4" d="M371.9,122.15c-1.22-43.77-38-78.89-83.31-78.89-46,0-83.33,36.31-83.33,81.11,0,.95,0,2.27,0,3.55" />
          {/* Face details */}
          <g opacity="0.45" fill="currentColor">
            <path d="M292.32,44.18a36,36,0,0,0-15.5,3.4,44.92,44.92,0,0,0-7,3.93,49.88,49.88,0,0,0-6.18,5.05,64.33,64.33,0,0,0-10,12.39c-1.46,2.23-2.68,4.6-3.95,7-1.12,2.42-2.31,4.81-3.26,7.3a131,131,0,0,0-5,15.18c-.61,2.6-1.31,5.17-1.84,7.79l-.77,3.92c-.27,1.31-.53,2.62-.71,3.94a246.35,246.35,0,0,0-3.1,31.85c-.77,21.34-.89,42.72.25,64.05.68,10.66,1.56,21.31,3.15,31.87.83,5.27,1.73,10.54,3,15.72.31,1.3.61,2.6,1,3.88s.7,2.58,1.15,3.84.84,2.53,1.36,3.76a25.94,25.94,0,0,0,1.69,3.62,26,26,0,0,1-1.72-3.61c-.52-1.23-1-2.49-1.39-3.76s-.79-2.55-1.18-3.82-.7-2.58-1-3.88c-1.32-5.18-2.26-10.44-3.13-15.71-1.63-10.57-2.53-21.23-3.24-31.89-1.2-21.34-1.14-42.73-.42-64.09a247.25,247.25,0,0,1,3.19-31.9c.19-1.32.45-2.63.72-3.94l.79-3.94c.53-2.61,1.24-5.2,1.86-7.8a129.1,129.1,0,0,1,5.09-15.2c1-2.5,2.16-4.89,3.29-7.32s2.51-4.73,4-7a63.54,63.54,0,0,1,10.11-12.42,51.33,51.33,0,0,1,6.25-5,45.61,45.61,0,0,1,7-3.88A35.87,35.87,0,0,1,292.32,44.18Z" />
            <path d="M203.4,143.7a10.47,10.47,0,0,0,2.24,4.86a20,20,0,0,0,1.8,2a24.21,24.21,0,0,0,2.08,1.71a36.1,36.1,0,0,0,9.63,4.83a86.2,86.2,0,0,0,21.18,4.08c1.8.12,3.6.32,5.4.36l5.41.19c3.61,0,7.22,0,10.83-.12s7.21-.34,10.81-.55,7.2-.6,10.79-.93c14.37-1.44,28.66-3.6,42.87-6.19,7.1-1.35,14.2-2.68,21.26-4.21s14.12-3.07,21.17-4.61c-7,1.62-14.05,3.36-21.12,4.85s-14.15,2.92-21.25,4.3c-14.2,2.64-28.5,4.86-42.8,6.36-3.6.32-7.2.64-10.81.89S265.6,162,262,162s-7.23.09-10.84.07l-5.42-.2c-1.81-.06-3.61-.26-5.41-.38a87,87,0,0,1-21.25-4.19,36.37,36.37,0,0,1-9.61-5,23.06,23.06,0,0,1-2.07-1.75,18.28,18.28,0,0,1-1.79-2A10.54,10.54,0,0,1,203.4,143.7Z" />
            <path d="M335.1,137.83a33,33,0,0,0-2.79,7.29,31.31,31.31,0,0,0-.95,7.71,31.79,31.79,0,0,0,.95,7.71,33.12,33.12,0,0,0,2.79,7.3,28.06,28.06,0,0,1-3.16-7.2,29.79,29.79,0,0,1-1.08-7.81,30.28,30.28,0,0,1,1.08-7.81A27.84,27.84,0,0,1,335.1,137.83Z" />
          </g>
        </svg>
      );
    }
    // activeCaptureSlot === 3: Hadap Kanan (ViewBox: 0 0 613.5 388.61)
    return (
      <svg 
        className="w-full h-full text-emerald-500/90 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
        viewBox="0 0 613.5 388.61" 
        preserveAspectRatio="xMidYMid slice" 
        fill="none"
      >
        {/* Backdrop mask (cutout) */}
        <path 
          fill="rgba(15, 23, 42, 0.55)" 
          d="M0,0V388.61H98.44a58.3,58.3,0,0,1,42.26-56.05l15.35-4.4.7-1.34v1.34L253,295.25c29.27-27.59,16.19-70.11,16.19-70.11l-.24-2.43a46.46,46.46,0,0,1-8.42-14.43c-7.19-21.3-15.81-36.79-19.34-79l.1,0c-.06-1.23-.1-2.48-.1-3.73,0-44.8,37.31-81.11,83.34-81.11s83.33,36.31,83.33,81.11c0,2.44-.11,7.43,0,7.53s.54,29.55,1.73,42.23c2,20.78.63,31.36-10.25,54.77-9.59,20.66-12.57,33.61-27.49,40.4h0c-16.21,15.86-6,34.87-6,34.87l89.68,22.57.48.3h0l15.36,4.4a58.3,58.3,0,0,1,42.25,56.05H613.5V0Z"
        />
        {/* Glowing Silhouette line */}
        <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M408,130.41a16.68,16.68,0,0,0,0,2s0,.72,0,2" />
        <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="4 4" d="M408.16,138.4c.23,9.31.75,27.13,1.6,36.24,1.95,20.78.63,31.36-10.24,54.77s-13.23,36.94-34.14,42.8-38.62-2.66-65.38-22.73-35.74-31.24-39.3-41.81c-7-20.62-15.26-35.8-19-75" />
        <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M241.54,130.64l-.18-2,.1,0c0-.66-.06-1.33-.07-2" />
        <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="4 4" d="M241.39,122.65c1.22-43.77,38.05-78.89,83.31-78.89,46,0,83.33,36.32,83.33,81.12,0,.94,0,2.27,0,3.54" />
        {/* Face details */}
        <g opacity="0.45" fill="currentColor">
          <path d="M321.53,44.18a36,36,0,0,1,15.56,3.29,46.56,46.56,0,0,1,7,3.88,52,52,0,0,1,6.24,5A64,64,0,0,1,360.46,68.8c1.47,2.23,2.7,4.61,4,7s2.34,4.82,3.29,7.32a131,131,0,0,1,5.09,15.2c.61,2.6,1.32,5.19,1.86,7.8l.78,3.94c.27,1.31.54,2.62.72,3.94a245.49,245.49,0,0,1,3.19,31.9c.72,21.36.78,42.75-.41,64.09-.71,10.66-1.62,21.32-3.25,31.89-.87,5.27-1.8,10.53-3.13,15.71-.32,1.3-.63,2.6-1,3.88s-.72,2.57-1.18,3.82-.86,2.53-1.38,3.76a26,26,0,0,1-1.73,3.61A26,26,0,0,0,369,269c.51-1.23.94-2.5,1.35-3.76s.77-2.56,1.15-3.84.69-2.58,1-3.88c1.29-5.18,2.18-10.45,3-15.72,1.59-10.56,2.48-21.21,3.16-31.87,1.13-21.33,1-42.71.25-64.05A246.36,246.36,0,0,0,375.77,114c-.18-1.32-.44-2.63-.7-3.94l-.78-3.92c-.52-2.62-1.23-5.19-1.83-7.79a131,131,0,0,0-5-15.18c-.94-2.49-2.14-4.88-3.26-7.3s-2.49-4.72-4-7a64.28,64.28,0,0,0-10-12.39A50,50,0,0,0,344,51.51,45.29,45.29,0,0,0,337,47.58,36,36,0,0,0,321.53,44.18Z" />
          <path d="M410.45,143.7a10.53,10.53,0,0,1-2.18,4.89a19.35,19.35,0,0,1-1.79,2a24.69,24.69,0,0,1-2.08,1.75a36.22,36.22,0,0,1-9.61,5a86.84,86.84,0,0,1-21.24,4.19c-1.81,0.12-3.6,0.32-5.41,0.38l-5.42,0.2c-3.62,0-7.23,0.07-10.85-0.07s-7.22-0.32-10.83-0.51s-7.21-0.57-10.81-0.89c-14.38-1.5-28.67-3.72-42.88-6.36c-7.09-1.38-14.19-2.74-21.25-4.3s-14.07-3.08-21.07-4.7c7.06,1.54,14.09,3.2,21.17,4.61s14.16,2.86,21.26,4.21c14.21,2.59,28.5,4.75,42.87,6.19c3.6,0.33,7.19,0.67,10.79,0.93s7.21,0.49,10.82,0.55s7.21,0.12,10.82,0.12l5.41-0.19c1.8,0,3.6-0.24,5.4-0.36a86.28,86.28,0,0,0,21.19-4.08a36.19,36.19,0,0,0,9.62-4.83a24.35,24.35,0,0,0,2.09-1.71a22.85,22.85,0,0,0,1.8-2A10.56,10.56,0,0,0,410.45,143.7Z" />
          <path d="M278.76,137.83a28.16,28.16,0,0,1,3.15,7.19a28.78,28.78,0,0,1,0,15.62a28.38,28.38,0,0,1-3.15,7.2,33.09,33.09,0,0,0,2.78-7.3a31.76,31.76,0,0,0,0-15.42A33,33,0,0,0,278.76,137.83Z" />
        </g>
      </svg>
    );
  };

  const slots = [
    { id: 1, title: 'Pandangan Lurus', desc: 'Hadap lurus ke depan', value: photo1 },
    { id: 2, title: 'Pandangan Kiri', desc: 'Palingkan wajah sedikit ke kiri', value: photo2 },
    { id: 3, title: 'Pandangan Kanan', desc: 'Palingkan wajah sedikit ke kanan', value: photo3 }
  ] as const;

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8 border-b border-slate-50 pb-5">
        <button
          onClick={() => {
            stopCamera();
            onBack();
          }}
          className="p-2 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Registrasi Wajah Machine Learning</h2>
          <p className="text-slate-400 text-xs mt-0.5">Daftarkan 3 sudut foto wajah untuk user: <span className="font-semibold text-slate-600">{user.name}</span></p>
        </div>
      </div>

      {/* Messages */}
      {cameraError && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-100 text-amber-800 text-xs font-semibold rounded-2xl flex items-start gap-2.5">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{cameraError}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-800 text-xs font-semibold rounded-2xl flex items-start gap-2.5">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2.5">
          <CheckCircle size={16} className="flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Panel: Large Camera Feed (Col Span 7) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Layar Kamera Utama</h3>
            
            {/* Aspect Square Monitor */}
            <div className="w-full aspect-square bg-slate-950 rounded-[2rem] overflow-hidden relative border border-slate-900 shadow-2xl flex items-center justify-center transition-all duration-300 ring-4 ring-emerald-500/10 hover:ring-emerald-500/20">
              {isCameraStarted ? (
                // Live Stream View
                <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover scale-x-[-1]"
                    playsInline
                    muted
                  />
                  
                  {/* Realistic biometric vignette mask and crosshair guide overlay */}
                  <div className="absolute inset-0 pointer-events-none z-10">
                    {renderBiometricOverlay()}
                  </div>

                  {/* Glowing Corner Brackets */}
                  <div className="absolute top-6 left-6 w-6 h-6 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg pointer-events-none z-20 opacity-80" />
                  <div className="absolute top-6 right-6 w-6 h-6 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg pointer-events-none z-20 opacity-80" />
                  <div className="absolute bottom-6 left-6 w-6 h-6 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg pointer-events-none z-20 opacity-80" />
                  <div className="absolute bottom-6 right-6 w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br-lg pointer-events-none z-20 opacity-80" />

                  {/* Pulsing indicator of active slot */}
                  <div className="absolute top-6 left-6 bg-slate-950/80 backdrop-blur-md text-white px-3.5 py-2 rounded-2xl text-[10px] font-bold border border-white/10 flex items-center gap-2 shadow-lg z-20">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
                    </span>
                    <span className="tracking-wide">MENANGKAP: {slots.find(s => s.id === activeCaptureSlot)?.title.toUpperCase()}</span>
                  </div>

                  {/* Shutter Button & Dock */}
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
                    <div className="bg-slate-950/60 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/10 shadow-lg flex items-center justify-center">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 border-4 border-white p-0.5 transition-all duration-200 active:scale-90 flex items-center justify-center cursor-pointer shadow-md"
                        title="Ambil Foto"
                      >
                        <div className="w-9 h-9 bg-red-500 hover:bg-red-600 rounded-full transition-colors shadow-inner" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // Camera Inactive / Placeholder Screen
                <div className="flex flex-col items-center justify-center p-8 text-center w-full h-full min-h-[350px] bg-slate-950 bg-[radial-gradient(ellipse_at_center,rgba(15,23,42,0.8),rgba(2,6,23,1))]">
                  <div className="w-20 h-20 rounded-full bg-slate-900/80 border border-slate-800 text-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.15)] flex items-center justify-center mb-5 animate-pulse">
                    <Camera size={32} />
                  </div>
                  <h4 className="font-extrabold text-slate-200 text-base tracking-tight">Kamera Belum Aktif</h4>
                  <p className="text-slate-400 text-xs mt-2.5 max-w-[290px] leading-relaxed font-medium">
                    Sistem memerlukan izin kamera Anda untuk mulai menangkap foto wajah. Klik tombol di bawah untuk meminta akses.
                  </p>
                  <button
                    type="button"
                    onClick={startWebcam}
                    className="mt-8 px-7 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-2xl font-extrabold text-xs tracking-wider shadow-lg shadow-emerald-950/20 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Camera size={14} />
                    <span>MULAI KAMERA</span>
                  </button>
                </div>
              )}
            </div>

            {/* Guide Text Banner below Camera */}
            <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl flex items-start gap-3 shadow-xs">
              <div className="w-10 h-12 rounded-lg bg-white border border-slate-100 p-1 flex-shrink-0 flex items-center justify-center">
                <img 
                  src={
                    activeCaptureSlot === 1 
                      ? '/Guide-Front.png' 
                      : activeCaptureSlot === 2 
                        ? '/Guide-Left.png' 
                        : '/Guide-Right.png'
                  } 
                  alt="Guide" 
                  className="w-full h-full object-contain" 
                />
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Panduan Perekaman</span>
                <p className="text-xs font-semibold text-slate-600 mt-0.5 leading-relaxed">{getGuideText()}</p>
              </div>
            </div>
          </div>

          {/* Right Panel: Active Slots Stack (Col Span 5) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Daftar Foto Wajah (3 Sudut)</h3>
            
            <div className="space-y-4">
              {slots.map((slot) => {
                const isActive = activeCaptureSlot === slot.id;
                const hasPhoto = !!slot.value;

                return (
                  <div
                    key={slot.id}
                    onClick={() => {
                      if (!isCameraStarted && !hasPhoto) {
                        startWebcam();
                      }
                      setActiveCaptureSlot(slot.id);
                    }}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer group ${
                      isActive
                        ? 'border-emerald-500 bg-emerald-50/20 ring-4 ring-emerald-500/5 shadow-md shadow-emerald-500/5 scale-[1.02]'
                        : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/40 scale-100'
                    }`}
                  >
                    {/* Left: Info Text & File upload fallback */}
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full transition-all ${
                          hasPhoto ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-300'
                        }`} />
                        <h4 className="text-xs font-bold text-slate-700">{slot.title}</h4>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{slot.desc}</p>
                      
                      {/* Upload button fallback */}
                      {!hasPhoto && (
                        <label className="inline-flex items-center gap-1.5 mt-2.5 px-3 py-1 bg-slate-50 hover:bg-slate-100 hover:text-emerald-700 border border-slate-200/60 rounded-xl text-[9px] font-extrabold text-slate-500 cursor-pointer transition-all active:scale-95">
                          <Upload size={10} className="text-slate-400" />
                          <span>Upload File</span>
                          <input
                            type="file"
                            accept="image/*"
                            onClick={(e) => e.stopPropagation()} // Stop triggering parent onClick select
                            onChange={(e) => handleFileUpload(e.target.files?.[0] || null, slot.id)}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>

                    {/* Right: Small preview box */}
                    <div className="flex-shrink-0">
                      {hasPhoto ? (
                        <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-100 relative group/preview shadow-xs">
                          <img src={slot.value || ''} alt={slot.title} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              resetPhoto(slot.id);
                            }}
                            className="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover/preview:opacity-100 flex items-center justify-center rounded-xl transition-all"
                            title="Hapus"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className={`w-16 h-16 rounded-xl border border-dashed flex items-center justify-center p-2 relative ${
                          isActive
                            ? 'border-emerald-300 bg-emerald-50/20 text-emerald-600'
                            : 'border-slate-200 bg-slate-50/50 text-slate-400'
                        }`}>
                          <img 
                            src={
                              slot.id === 1 
                                ? '/Guide-Front.png' 
                                : slot.id === 2 
                                  ? '/Guide-Left.png' 
                                  : '/Guide-Right.png'
                            } 
                            alt={slot.title} 
                            className="w-full h-full object-contain opacity-50 group-hover:opacity-80 transition-opacity" 
                          />
                          <span className="absolute bottom-1 right-1 bg-slate-900/60 text-white text-[7px] font-extrabold px-1 rounded-sm scale-90">
                            GUIDE
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Warning/Tips */}
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl mt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ketentuan Registrasi</span>
              <p className="text-[10px] text-slate-500 leading-relaxed mt-1.5">
                Pastikan wajah Anda tidak terhalang masker, kacamata hitam, atau topi saat berfoto. Sistem membutuhkan pendaftaran wajah yang jelas untuk dual-factor authentication pada pintu gate.
              </p>
            </div>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="pt-5 border-t border-slate-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onBack();
            }}
            className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs tracking-wide transition-colors cursor-pointer"
          >
            Batal
          </button>
          
          <button
            type="submit"
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white px-7 py-3 rounded-2xl font-bold text-xs tracking-wide transition-all shadow-md shadow-emerald-600/10 flex items-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Menyimpan Wajah...</span>
              </>
            ) : (
              <span>Simpan & Daftarkan Wajah</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
