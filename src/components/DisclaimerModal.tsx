interface DisclaimerModalProps {
  open: boolean;
  onAccept: () => void;
}

const DISCLAIMER_TEXT = `本工具是独立的开源研究工具，非 TikTok 官方产品。

你需自行判断使用行为是否符合所在地法规与平台条款。
翻译、代理及 API Key 由你自行配置，本工具不提供任何内置额度。
配置保存在本机应用目录，API Key 不会上传，但也不会加密托管。

因使用本工具引发的任何封禁、纠纷或损失，由使用者自行承担。`;

export function DisclaimerModal({ open, onAccept }: DisclaimerModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div>
          <p className="eyebrow">免责说明</p>
          <h2>首次使用前请确认</h2>
        </div>
        <pre className="modal-copy">{DISCLAIMER_TEXT}</pre>
        <button type="button" className="primary-button" onClick={onAccept}>
          我已知晓并同意
        </button>
      </div>
    </div>
  );
}
