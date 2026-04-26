import { redirect } from 'next/navigation'

export default function NewBrigadeRedirect() {
  redirect('/dashboard/brigades/new')
}
