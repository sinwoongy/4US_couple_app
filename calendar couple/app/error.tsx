"use client";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ reset }: ErrorProps) {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Error</p>
        <h1>페이지를 불러오는 중 문제가 발생했어요.</h1>
        <p className="helper-text">
          잠시 후 다시 시도해 주세요. 문제가 계속되면 연결 상태와 환경 설정을 다시
          확인해 보세요.
        </p>
        <div className="actions-row">
          <button className="primary-button" onClick={reset} type="button">
            다시 시도
          </button>
        </div>
      </section>
    </main>
  );
}
