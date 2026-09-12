// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Quiz } from "./quiz";

const question =
  "某公司規定：密碼每 30 天必須更換，且不得與前 10 組重複。依照前面推導出來的取捨，這條規則最可能造成什麼？";

const options = [
  {
    label: "密碼變得更難被猜中，整體更安全",
    explanation: "方向反了。規則沒有改變密碼的組合數，只是縮短了更換週期。",
  },
  {
    label: "使用者改用 Password1、Password2 這類可預測的變形",
    correct: true,
    explanation: "人腦存不住每月一組新的隨機字串，只能找出口。",
  },
  {
    label: "沒有影響，反正密碼外洩了就會被通知",
    explanation: "這正是那條規則背後「外洩後你不會知道」的舊假設被推翻的原因。",
  },
];

describe("Quiz", () => {
  it("shows no status region before answering", () => {
    render(<Quiz question={question} options={options} />);

    expect(screen.getByText(question)).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("selecting the correct option reveals success and disables all options", async () => {
    const user = userEvent.setup();
    render(<Quiz question={question} options={options} />);

    await user.click(screen.getByRole("button", { name: options[1].label }));

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("答對了");
    expect(status).toHaveTextContent(options[1].explanation);

    for (const option of options) {
      expect(screen.getByRole("button", { name: option.label })).toBeDisabled();
    }
  });

  it("selecting a wrong option reveals the mistake and the correct answer", async () => {
    const user = userEvent.setup();
    render(<Quiz question={question} options={options} />);

    await user.click(screen.getByRole("button", { name: options[0].label }));

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("再想想");
    expect(status).toHaveTextContent(options[0].explanation);
    expect(status).toHaveTextContent(`正確答案：${options[1].label}`);
    expect(status).toHaveTextContent(options[1].explanation);
  });

  it("重新作答 resets the quiz so it can be answered again", async () => {
    const user = userEvent.setup();
    render(<Quiz question={question} options={options} />);

    await user.click(screen.getByRole("button", { name: options[0].label }));
    expect(screen.getByRole("status")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "重新作答" }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    for (const option of options) {
      expect(
        screen.getByRole("button", { name: option.label })
      ).not.toBeDisabled();
    }
  });
});
