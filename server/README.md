# EchoChunk Server - Audio Transcription & Word-Level Alignment

Hệ thống xử lý âm thanh và trích xuất mốc thời gian chi tiết theo từng từ (**Word-Level Timestamps**) phục vụ tính năng chạy chữ Karaoke / Shadowing cho ứng dụng luyện nói tiếng Anh (**EchoChunk**), xây dựng trên nền tảng **WhisperX** và **PyTorch CUDA**.

---

## 🚀 Tính năng chính

- **Chuyển đổi giọng nói thành văn bản (Speech-to-Text)**: Sử dụng mô hình Whisper (`large-v3` / `large-v2`) được tối ưu hoá qua CTranslate2.
- **Căn chỉnh mốc thời gian từng từ (Phoneme-level Alignment)**: Sử dụng Wav2Vec2 để xác định chính xác mili-giây bắt đầu (`start`) và kết thúc (`end`) của từng từ.
- **Tối ưu bộ nhớ GPU (INT8 Quantization)**: Tiết kiệm 50% VRAM (chỉ chiếm ~3.5GB), tương thích tốt với các dòng GPU phổ thông (4GB - 6GB VRAM) mà không giảm chất lượng nhận diện.
- **Interactive Karaoke Display**: Giao diện hiển thị HTML/JS nhúng trực tiếp trong Jupyter Notebook hoặc Web Frontend.

---

## 🛠️ Yêu cầu môi trường (Prerequisites)

1. **Hệ điều hành**: Windows 10/11 (hoặc Linux).
2. **GPU NVIDIA**: Tối thiểu 4GB VRAM, đã cài đặt NVIDIA Driver & CUDA.
3. **FFmpeg**: Đã cài đặt và thêm vào biến môi trường `PATH`.
   - Kiểm tra bằng lệnh: `ffmpeg -version`
4. **Trình quản lý gói**: Khuyên dùng [uv](https://github.com/astral-sh/uv) (tốc độ cài đặt cực nhanh).

---

## 📦 Cài đặt dự án

Khởi tạo môi trường ảo và đồng bộ toàn bộ thư viện:

```powershell
# Cài đặt toàn bộ dependencies theo pyproject.toml
uv sync
```

Hoặc cài đặt thủ công nếu cần:
```powershell
uv add "torch==2.8.0" "torchaudio==2.8.0" --index pytorch
uv add "whisperx==3.8.6" ipykernel ipywidgets hf-xet
```

---

## 🔄 Luồng xử lý chuẩn (Pipeline Workflow)

Dự án tinh gọn luồng xử lý chỉ gồm **2 bước thiết yếu** (bỏ qua bước Diarization để tiết kiệm tài nguyên):

```
Audio File (.mp3/.wav)
        │
        ▼
[ 1. Transcribe (Whisper large-v3 / int8) ]  ---> Nhận dạng văn bản thô theo đoạn câu
        │
        ▼
[ 2. Align (Wav2Vec2) ]                     ---> Căn chỉnh mốc thời gian chi tiết từng từ
        │
        ▼
[ 3. JSON Output / Frontend Rendering ]     ---> Mảng từ có start / end phục vụ Karaoke
```

---

## 💻 Hướng dẫn sử dụng mẫu (Quickstart)

```python
import os
import warnings
import whisperx

# 1. Tắt các cảnh báo không cần thiết từ thư viện phụ
warnings.filterwarnings("ignore")
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

device = "cuda"
compute_type = "int8"   # Tiết kiệm 50% VRAM, chống tràn bộ nhớ GPU
batch_size = 16         # Tăng tốc độ nhận dạng nhanh gấp 3-5 lần

# 2. Đọc file âm thanh
audio_file = "./english.mp3"
audio = whisperx.load_audio(audio_file)

# 3. Transcribe (Nhận dạng chữ)
model = whisperx.load_model("large-v3", device=device, compute_type=compute_type)
result = model.transcribe(audio, batch_size=batch_size, language="en")

# 4. Align (Căn chỉnh mốc thời gian từng từ)
model_a, metadata = whisperx.load_align_model(
    language_code=result["language"], 
    device=device
)
aligned_result = whisperx.align(
    result["segments"], 
    model_a, 
    metadata, 
    audio, 
    device, 
    return_char_alignments=False
)

# 5. Dữ liệu mốc thời gian từng từ thu được
for segment in aligned_result["segments"]:
    for word_info in segment.get("words", []):
        word = word_info["word"]
        start = float(word_info.get("start", 0))
        end = float(word_info.get("end", 0))
        print(f"[{start:.2f}s -> {end:.2f}s]: {word}")
```

---

## ⚠️ Các lưu ý kỹ thuật quan trọng (Gotchas & Best Practices)

### 1. Luôn dùng `compute_type="int8"` thay vì `float16`
* `float16` ngốn tới **~7GB – 8.5GB VRAM** khi nạp mô hình `large-v3` cùng VAD, dễ gây lỗi `CUDA Out of Memory (OOM)` trên card 4GB/6GB.
* `int8` chỉ ngốn **~3.2GB – 4.2GB VRAM**, sai số nhận diện (WER) suy hao dưới **1%**, máy chạy mát hơn và tốc độ tương đương hoặc nhanh hơn.

### 2. Luôn truyền tham số `batch_size=16`
* Khi không truyền `batch_size`, hàm `model.transcribe()` sẽ chạy mặc định ở `batch_size=1` (tuần tự từng đoạn).
* Truyền `batch_size=16` giúp mô hình xử lý song song nhiều đoạn thoại cùng lúc trên các nhân CUDA, giảm đáng kể thời gian chờ.

### 3. Ép kiểu `float(...)` trước khi truyền vào Frontend / JavaScript
* Mốc thời gian của WhisperX trả về dưới dạng `numpy.float64`. Khi serialize sang JSON hoặc nhúng vào JavaScript, **bắt buộc** phải ép kiểu:
  ```python
  start = float(w["start"]) if w.get("start") is not None else None
  ```
  *(Nếu dùng trực tiếp `str(words)` mà không ép kiểu, JavaScript sẽ văng lỗi `Uncaught ReferenceError: np is not defined`).*

### 4. Không cần sử dụng Speaker Diarization
* Với ứng dụng luyện nói, hiển thị phụ đề hoặc chạy chữ theo âm thanh, bước phân tách người nói (Diarization) là không cần thiết. Bỏ qua bước này giúp tiết kiệm thêm 2GB VRAM và không cần đăng ký HuggingFace Access Token cho Pyannote.
