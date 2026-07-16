<?php

namespace Database\Factories;

use App\Enums\InvoiceItemType;
use App\Models\InvoiceItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InvoiceItem>
 */
class InvoiceItemFactory extends Factory {
    protected $model = InvoiceItem::class;

    /**
     * Define the model's default state.
     *
     * IMPORTANT: `net` is a MySQL VIRTUAL GENERATED column
     * (`net = total = price_discounted * qty * unit_factor`, with
     * price_discounted = round(price * (100 - discount) * 0.01, 2)), so it
     * CANNOT be written directly. With discount=0, unit_name != '%' and
     * vat_calculation=0, `net` equals `price * qty` — so net() below just sets
     * price (qty=1). Discovered while writing the ML factories.
     *
     * @return array<string, mixed>
     */
    public function definition(): array {
        return [
            'text'            => fake()->words(3, true),
            'type'            => InvoiceItemType::Default,
            'qty'             => 1,
            'discount'        => 0,
            'unit_name'       => 'h',
            'price'           => fake()->randomFloat(2, 50, 5000),
            'vat_calculation' => 0,
        ];
    }

    public function repeating(): static {
        return $this->state(['type' => InvoiceItemType::Monthly]);
    }
    public function ofType(InvoiceItemType $type): static {
        return $this->state(['type' => $type]);
    }

    /** Pin a specific net via price (net = price * qty with qty=1, discount=0). */
    public function net(float $net): static {
        return $this->state(['price' => $net, 'qty' => 1, 'discount' => 0, 'unit_name' => 'h', 'vat_calculation' => 0]);
    }
}
