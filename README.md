# 📄 PaperHome

### *Your Intelligent Academic Compass*

![PaperHome Banner](https://img.shields.io/badge/PaperHome-v1.0-blue?style=for-the-badge&logo=googlescholar)

---

**PaperHome** is a cutting-edge web application designed to help researchers find the perfect publishing venue for their manuscripts. By leveraging **Google Gemini AI** for content analysis and a custom **Jaccard Similarity algorithm** for matching, PaperHome bridges the gap between your specific research topics and the broad scopes of national (SINTA) and international (Scopus) journals.

## ✨ Key Features

*   **🧠 AI-Powered Analysis**: Automatically extracts your paper's **Research Field**, **Primary Keywords**, and generates **Expanded/Broad Topics** using Google Gemini AI to ensure no relevant journal is missed.
*   **🔍 Dual-Database Search**:
    *   **National**: Searches a curated local database of **SINTA** journals (Indonesia) with smart caching.
    *   **International**: Real-time integration with the **Elsevier Scopus API** to find high-impact global journals.
*   **🎯 Smart Matching Engine**:
    *   Uses a weighted **Jaccard Similarity** algorithm.
    *   Implments **"Bridging" Logic**: Matches your specific terms (e.g., "Pesantren") to broader journal scopes (e.g., "Islamic Education") for higher recall.
*   **📊 Comprehensive Metrics**:
    *   **Scopus Quartiles (Q1-Q4)** (Heuristic calculation based on CiteScore).
    *   **CiteScore** & **SJR** metrics.
    *   **Processing Time** estimates.
*   **⚡ Interactive Filtering**: Filter by SINTA Rank, Quartile, Indexing (Scopus, DOAJ), Open Access, and Fast Track publishing.

## 🛠️ Technology Stack

*   **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **AI Engine**: [Google Gemini Pro](https://ai.google.dev/)
*   **Data Sources**:
    *   Local JSON Database (Curated SINTA Journals)
    *   [Elsevier Scopus API](https://dev.elsevier.com/)
*   **Text Processing**: `pdf-parse`, `mammoth` (for .docx), `natural` (tokenization).

## 🚀 Getting Started

Follow these steps to set up the project locally.

### Prerequisites

*   Node.js 18+ installed.
*   **Gemini API Key** (from Google AI Studio).
*   **Elsevier API Key** (for Scopus search).

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/paperhome.git
    cd paperhome/paperhome-web
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**:
    Create a `.env.local` file in the `paperhome-web` directory:
    ```env
    # .env.local
    GEMINI_API_KEY=your_gemini_api_key_here
    ELSEVIER_API_KEY=your_elsevier_api_key_here
    ```

4.  **Run the Development Server**:
    ```bash
    npm run dev
    ```

5.  **Open the App**:
    Visit `http://localhost:3000` in your browser.

## 📂 Project Structure

```bash
paperhome-web/
├── src/
│   ├── app/
│   │   ├── api/          # Backend API Routes (Analyze, Search)
│   │   ├── layout.tsx    # Root Layout & Global Styles
│   │   └── page.tsx      # Main UI (Upload, Results, Dashboard)
│   ├── components/       # Reusable UI Components (Sidebar, Modals)
│   ├── lib/              # Utility Libraries (Jaccard Logic, Sinta Helper)
│   └── styles/           # Global CSS (Tailwind directives)
├── data/                 # Master Journal Database (JSON)
├── public/               # Static Assets
└── ...
```

## 📸 Screenshots

*(Add screenshots of your dashboard and results page here)*

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact & Support

If you encounter any issues or have suggestions, please reach out to the developer:

*   **Email**: `rahmanhanafi@mhs.unsiq.ac.id`
*   **Instagram**: [`@fromrha`](https://instagram.com/fromrha)

---

Built with ❤️ by **Rahman Hanafi** | [PaperHome Team]
