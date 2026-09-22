export type Category =
  | 'dairy'
  | 'meat'
  | 'fish'
  | 'produce'
  | 'bakery'
  | 'leftovers'
  | 'frozen'
  | 'tinned'
  | 'dried'
  | 'jarred'
  | 'packaged'
  | 'uht'
  | 'other';

export type ItemStatus = 'active' | 'used' | 'donated' | 'wasted';

export type Item = {
  id: string;
  name: string;
  category: Category;
  /** Derived from category when the item is created; stored so rules stay pure. */
  shelfStable: boolean;
  quantity: number;
  /** ISO timestamp */
  addedAt: string;
  /** ISO timestamp */
  expiresAt: string;
  opened: boolean;
  status: ItemStatus;
  /** ISO timestamp of the last status change away from 'active'. */
  resolvedAt?: string;
};
