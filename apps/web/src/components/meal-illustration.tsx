import { Check, Sandwich, Utensils } from 'lucide-react';

export function MealIllustration() {
  return (
    <div className="meal-illustration" aria-hidden="true">
      <div className="meal-orbit" />
      <div className="meal-receipt">
        <span>麦麦任务 / 001</span>
        <strong>每份 ≤ 500 kcal</strong>
        <div>
          <Check size={13} /> 查工具数据
        </div>
        <div>
          <Check size={13} /> 核对单位
        </div>
        <div>
          <Check size={13} /> 留下依据
        </div>
        <small>DEMO · SYNTHETIC</small>
      </div>
      <div className="meal-fries">
        <i />
        <i />
        <i />
        <i />
        <i />
        <div className="fries-carton">
          <Utensils size={25} />
          <span>McAgent</span>
        </div>
      </div>
      <div className="meal-burger">
        <div className="burger-top">
          <i />
          <i />
          <i />
        </div>
        <div className="burger-lettuce" />
        <div className="burger-tomato" />
        <div className="burger-cheese" />
        <div className="burger-patty" />
        <div className="burger-bottom" />
      </div>
      <div className="meal-tag">
        <Sandwich size={14} /> 餐品查询 × 可信回答
      </div>
    </div>
  );
}
