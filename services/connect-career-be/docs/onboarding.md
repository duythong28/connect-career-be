```mermaid
flowchart LR
  %% =========================
  %% CANDIDATE ONBOARDING
  %% =========================
  A([Start]) --> B{Đăng ký / Đăng nhập?}
  B -->|Email/Phone| C[Nhập thông tin + OTP]
  B -->|SSO (Google/LinkedIn)| D[Uỷ quyền SSO]
  C --> E{Xác thực thành công?}
  D --> E
  E -->|Không| C1[Hiển thị lỗi & cho nhập lại] --> B
  E -->|Có| F[Chấp nhận Terms & Privacy] --> G[Chọn chế độ hồ sơ: Public/Private]
  subgraph W[Onboarding Wizard]
    direction LR
    H1[1. Thông tin cá nhân] --> H2[2. Học vấn & Kinh nghiệm]
    H2 --> H3[3. Kỹ năng & Chứng chỉ]
    H3 --> H4[4. Job Preferences<br/>(loại hình, địa điểm, mức lương)]
    H4 --> H5[5. Thiết lập thông báo việc làm]
  end
  G --> H0{Đã có CV?}
  H0 -->|Upload CV| U1[Upload CV & Parse] --> H1
  H0 -->|Dùng LinkedIn| U2[Import từ LinkedIn] --> H1
  H0 -->|Điền tay| H1
  H5 --> P{Hồ sơ ≥ 80%?}
  P -->|Chưa| P1[Nhắc nhở hoàn tất<br/>+ Progress bar] --> R
  P -->|Rồi| R[AI gợi ý việc làm phù hợp]
  R --> S{Bật Job Alerts?}
  S -->|Có| S1[Đăng ký Email/SMS] --> T([Finish])
  S -->|Không| T
```
---
```mermaid
flowchart LR
  %% =========================
  %% RECRUITER ONBOARDING
  %% =========================
  A_rec([Start]) --> B_rec{Đăng ký / Đăng nhập?}
  B_rec -->|Email công ty| C_rec[Nhập thông tin + xác thực domain]
  B_rec -->|SSO (Google/MS/LinkedIn)| D_rec[Uỷ quyền SSO]
  C_rec --> E_rec{Xác thực thành công?}
  D_rec --> E_rec
  E_rec -->|Không| C1_rec[Hiển thị lỗi & cho nhập lại] --> B_rec
  E_rec -->|Có| F_rec[Chấp nhận Terms for Employers]
  subgraph R1[Thông tin công ty]
    direction LR
    G1_rec[1. Tên, ngành, quy mô] --> G2_rec[2. Logo, banner, mô tả]
    G2_rec --> G3_rec[3. Chính sách tuyển dụng & văn hoá]
  end
  F_rec --> G1_rec
  subgraph R2[Thông tin Recruiter]
    direction LR
    H1_rec[Họ tên, chức vụ, liên hệ]
    H2_rec[Chứng thực vai trò (HR/Hiring Manager)]
  end
  G3_rec --> H1_rec --> H2_rec --> I_rec{Thiết lập nhóm HR?}
  I_rec -->|Có| I1_rec[Thêm thành viên & Phân quyền<br/>(Admin/Recruiter/Viewer)] --> J_rec
  I_rec -->|Không| J_rec[Chọn gói dịch vụ / Credits (tuỳ chọn)]
  J_rec --> K_rec{Đăng tin đầu tiên?}
  K_rec -->|Có| K1_rec[Import JD (LinkedIn/API) hoặc tạo mới] --> K2_rec[Thiết lập quy trình: sàng lọc, phỏng vấn, offer]
  K_rec -->|Để sau| M_rec
  K2_rec --> L_rec{Cần duyệt nội dung?}
  L_rec -->|Có| L1_rec[Moderation Queue] --> L2_rec{Được duyệt?}
  L2_rec -->|Không| L3_rec[Chỉnh sửa JD] --> K2_rec
  L2_rec -->|Có| M_rec[Bật Talent Pool & Tracking]
  M_rec --> N_rec{Bật Email/SMS cho ứng viên phù hợp?}
  N_rec -->|Có| N1_rec[Cấu hình tiêu chí & tần suất] --> O_rec([Finish])
  N_rec -->|Không| O_rec