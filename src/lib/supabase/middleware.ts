import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // refrescar sesión - getUser() es más seguro que getSession()
    const {
      data: { user },
      error
    } = await supabase.auth.getUser()

    if (error) {
      // Si hay error de sesión y no estamos en login, redirigir puede ser necesario 
      // pero solo si es un error crítico de auth.
      console.log("Middleware Auth Error:", error.message);
    }

    const path = request.nextUrl.pathname;
    
    // Lista Blanca: Evaluamos la sesión SOLO si el usuario intenta entrar a áreas Core
    const isProtectedRoute = 
      path === '/' || 
      path.startsWith('/alumnos') || 
      path.startsWith('/asistencias') || 
      path.startsWith('/clases') || 
      path.startsWith('/finanzas') || 
      path.startsWith('/pagos') ||
      path.startsWith('/config');

    const isLoginPage = path.startsWith('/login');

    if (!user && isProtectedRoute) {
      console.log("⚠️ Intento de acceso sin sesión a ruta protegida:", path);
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    if (user && isLoginPage) {
      console.log("✅ Usuario autenticado en pantala de login, regresando al home.");
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    return supabaseResponse
  } catch (e) {
    console.error("Critical error in Middleware:", e);
    return supabaseResponse;
  }
}
