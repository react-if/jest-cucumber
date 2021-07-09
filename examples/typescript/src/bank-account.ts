export class BankAccount {
  public balance = 0;

  public deposit(amount: number) {
    this.balance += amount;
  }

  public withdraw(amount: number) {
    this.balance -= amount;
  }
}
