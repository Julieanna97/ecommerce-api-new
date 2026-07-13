import { BaseModel } from "./BaseModel";
import { IOrderItem } from "./interfaces/IOrderItem";

export abstract class TransactionBase extends BaseModel {
    constructor(tableName: string) {
        super(tableName);
    }

    async calculateTotal(items: IOrderItem[]): Promise<number> {
        return items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    }
}