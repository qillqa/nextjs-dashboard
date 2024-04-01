'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.coerce.number(),
    status: z.enum(['pending', 'paid']),
    date: z.string(),
});
 
// Utilice Zod para actualizar los tipos esperados
const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
    // si se tiene muchos campo usar:
    // const rawFormData = Object.fromEntries(formData.entries())
    
    // const rawFormData = {
    const { customerId, amount, status } = CreateInvoice.parse({        
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    /* Generalmente es una buena práctica almacenar valores monetarios en centavos en su DB
    para eliminar errores de punto flotante de JavaScript y garantizar una mayor precisión. */
    const amountInCents = amount * 100;
    /* creamos una nueva fecha con el formato "AAAA-MM-DD" para la fecha de creación de la factura */
    const date = new Date().toISOString().split('T')[0];

    await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;

    // se revalidará la ruta y se obtendrán datos nuevos del servidor.
    revalidatePath('/dashboard/invoices');
    // redirigir al usuario a /dashboard/invoices
    redirect('/dashboard/invoices');

    // Test it out:
    // console.log(rawFormData);
}

export async function updateInvoice(id: string, formData: FormData) {
    const { customerId, amount, status } = UpdateInvoice.parse({
      customerId: formData.get('customerId'),
      amount: formData.get('amount'),
      status: formData.get('status'),
    });
   
    const amountInCents = amount * 100;
   
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;
   
    // Llamar a "revalidatePath" para borrar el caché del cliente y realizar una nueva solicitud al servidor.
    revalidatePath('/dashboard/invoices');
    // Llamar a "redirect" para redirigir al usuario a la página de la factura.
    redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
    await sql`DELETE FROM invoices WHERE id = ${id}`;

    // como estamos en "/dashboard/invoices" no es necesario llamar a "redirect"

    // activar una nueva solicitud del servidor y volverá a representar la tabla.
    revalidatePath('/dashboard/invoices');
}
