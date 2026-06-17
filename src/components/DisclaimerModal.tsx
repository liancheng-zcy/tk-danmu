interface DisclaimerModalProps {
  open: boolean;
  onAccept: () => void;
}

const DISCLAIMER_TEXT = `一、工具定位
本工具是一个独立的 TikTok 直播弹幕抓取与翻译研究工具，仅供学习、研究和个人自测使用。

二、责任边界
1. 本工具不是 TikTok 官方产品，也不代表任何平台或第三方服务商。
2. 本工具依赖非官方直播抓取能力，用户需自行判断是否符合所在地法规、平台条款和账号要求。
3. 翻译服务、代理服务与 API Key 由用户自行配置，本工具不提供任何内置额度、账号、卡密或远程代管服务。

三、风险说明
1. 直播抓取、代理使用、第三方翻译调用都可能存在账号、网络、服务稳定性与合规风险。
2. 配置保存在本机应用目录，包含 API Key 的设置不会上传，但也不会加密托管。
3. 任何因使用本工具引发的封禁、纠纷、损失或内容责任，由使用者自行承担。`;

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
