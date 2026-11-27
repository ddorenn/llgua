import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Политика конфиденциальности" };

/**
 * Privacy notice for the early-access form and the pilot. Operator details marked [заполнить] must be
 * completed by the owner before public promotion (legal review not done, 16 PRV-8).
 */
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-[760px] px-5 py-16 sm:py-24">
      <Link href="/" className="font-[family-name:var(--font-display)] text-[20px] font-bold tracking-[-0.04em] text-fg">
        LINGUA
      </Link>
      <h1 className="mt-10 text-[34px] font-semibold tracking-[-0.03em] text-fg sm:text-[42px]">Политика конфиденциальности</h1>
      <p className="mt-2 text-[13px] text-subtle">Редакция от 27 ноября 2026 г.</p>
      <div className="mt-8 space-y-6 text-[15.5px] leading-relaxed text-muted [&_h2]:mt-8 [&_h2]:text-[19px] [&_h2]:font-semibold [&_h2]:text-fg">
        <h2>Кто обрабатывает данные</h2>
        <p>Оператор — владелец проекта LINGUA. Контакт для вопросов и запросов об удалении: [заполнить: e-mail оператора].</p>
        <h2>Заявка на ранний доступ</h2>
        <p>
          Мы собираем только то, что нужно, чтобы связаться с вами: контакт (e-mail или Telegram), по желанию — имя и примерный уровень
          английского. Дополнительно сохраняются метки источника перехода (UTM), адрес страницы, с которой вы пришли (без параметров), и
          обезличенный хеш IP-адреса — только для защиты от спама.
        </p>
        <p>Цель — сообщить вам об открытии доступа. Рекламных рассылок мы не делаем и данные третьим лицам не продаём.</p>
        <h2>Пилот платформы</h2>
        <p>
          У участников пилота хранятся результаты диагностики, ответы в занятиях, тексты письменных заданий и статистика обучения. Голосовые
          записи не сохраняются. Для AI-функций тексты передаются провайдеру моделей (Groq, США) только на время обработки; провайдер по
          договору не использует их для обучения моделей.
        </p>
        <h2>Сроки и ваши права</h2>
        <p>
          Данные заявки хранятся до открытия доступа и не дольше 12 месяцев. Вы можете в любой момент запросить их удаление. Участники пилота
          могут сами скачать или удалить свои данные в разделе «Настройки → Аккаунт и данные».
        </p>
        <h2>Возраст</h2>
        <p>Пилот рассчитан на взрослых (18+). Мы не собираем намеренно данные несовершеннолетних.</p>
      </div>
    </main>
  );
}
