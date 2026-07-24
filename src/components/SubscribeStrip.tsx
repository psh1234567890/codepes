import { Check, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";

export function SubscribeStrip() {
  const [subscribed, setSubscribed] = useState(
    () => localStorage.getItem("codepes-subscription-email") !== null,
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    localStorage.setItem(
      "codepes-subscription-email",
      String(form.get("email") ?? ""),
    );
    setSubscribed(true);
  };

  return (
    <section className="subscribe-strip" aria-labelledby="subscribe-title">
      <div className="subscribe-copy">
        <span className="subscribe-icon">
          {subscribed ? (
            <Check aria-hidden="true" />
          ) : (
            <Mail aria-hidden="true" />
          )}
        </span>
        <div>
          <h2 id="subscribe-title">
            {subscribed
              ? "알림 받을 이메일을 저장했어요."
              : "새 대회가 올라오면 알려드릴게요."}
          </h2>
          <p>
            {subscribed
              ? "서버 연결 전까지는 이 브라우저에 안전하게 보관됩니다."
              : "원하는 유형의 대회 소식을 이메일로 받아보세요."}
          </p>
        </div>
      </div>

      {subscribed ? (
        <button
          className="text-button"
          type="button"
          onClick={() => {
            localStorage.removeItem("codepes-subscription-email");
            setSubscribed(false);
          }}
        >
          저장 취소
        </button>
      ) : (
        <form onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="subscribe-email">
            이메일 주소
          </label>
          <input
            id="subscribe-email"
            name="email"
            type="email"
            placeholder="이메일 주소를 입력하세요"
            required
          />
          <button type="submit">알림 준비</button>
        </form>
      )}
    </section>
  );
}
