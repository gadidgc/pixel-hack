import { useState } from 'react';
import { Linking, Pressable, TextInput, View } from 'react-native';
import { guardarPreferencias, telefonoOculto, type Contacto as TipoContacto } from '../preferencias';
import { usePreferencias } from '../useProteccion';
import { Boton, Pantalla, Pasos, Rotulo, T, Tarjeta } from '../ui/componentes';
import { Icono } from '../ui/iconos';
import { FUENTES, RADIO, useTema } from '../ui/tema';

export function textoInvitacion(nombre: string): string {
  return `${nombre || 'Alguien de tu familia'} te eligió como contacto de confianza en Vigía. Si alguna vez le arranchan el celular, te llegará un mensaje con su ubicación. No tienes que instalar nada.`;
}

/** Abre WhatsApp con la invitación ya escrita (no necesita backend). */
export function invitarPorWhatsApp(contacto: TipoContacto, nombre: string): void {
  const numero = contacto.telefono.replace(/\D/g, '');
  const conPais = numero.length === 9 ? `51${numero}` : numero;
  void Linking.openURL(`https://wa.me/${conPais}?text=${encodeURIComponent(textoInvitacion(nombre))}`);
}

/** F1 · 3/4 Tu contacto de confianza. */
export function Contacto({ onSeguir, onVolver, paso = true }: { onSeguir: () => void; onVolver: () => void; paso?: boolean }) {
  const c = useTema();
  const prefs = usePreferencias();
  const [nombre, setNombre] = useState<string | null>(null);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoTel, setNuevoTel] = useState('');
  const [error, setError] = useState('');
  if (!prefs) return null;
  const miNombre = nombre ?? prefs.nombre;
  const contactos = prefs.contactos;

  const agregar = async () => {
    const tel = nuevoTel.replace(/[^\d+]/g, '');
    if (!nuevoNombre.trim()) return setError('Escribe cómo se llama.');
    if (tel.replace(/\D/g, '').length < 9) return setError('El celular debe tener al menos 9 números.');
    setError('');
    await guardarPreferencias({ contactos: [...contactos, { nombre: nuevoNombre.trim(), telefono: tel }] });
    setNuevoNombre('');
    setNuevoTel('');
  };

  const quitar = (i: number) => void guardarPreferencias({ contactos: contactos.filter((_, j) => j !== i) });

  const seguir = async () => {
    await guardarPreferencias({ nombre: miNombre.trim() });
    onSeguir();
  };

  const campo = {
    backgroundColor: c.superficie2,
    borderRadius: RADIO.s,
    paddingHorizontal: 16,
    minHeight: 52,
    color: c.texto,
    fontFamily: FUENTES.texto,
    fontSize: 16,
  };

  return (
    <Pantalla>
      {paso ? <Pasos paso={3} total={4} onVolver={onVolver} /> : <Pasos paso={1} total={1} onVolver={onVolver} />}
      <View style={{ gap: 8 }}>
        <T v="titulo26" accessibilityRole="header">
          ¿A quién avisamos?
        </T>
        <T suave>Elige a alguien que suela tener el celular a la mano. Puedes agregar más después.</T>
      </View>

      <View style={{ gap: 8 }}>
        <Rotulo>TU NOMBRE (ASÍ TE VERÁN EN EL AVISO)</Rotulo>
        <TextInput style={campo} value={miNombre} onChangeText={setNombre} placeholder="Ana" placeholderTextColor={c.textoSuave} autoCapitalize="words" accessibilityLabel="Tu nombre" />
      </View>

      {contactos.map((x, i) => (
        <Tarjeta key={`${x.telefono}-${i}`} filo={c.protegido} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
          <View style={{ width: 44, height: 44, borderRadius: RADIO.total, backgroundColor: c.protegidoFondo, alignItems: 'center', justifyContent: 'center' }}>
            <T v="cuerpoFuerte" color={c.protegido}>
              {x.nombre.slice(0, 1).toUpperCase()}
            </T>
          </View>
          <View style={{ flex: 1 }}>
            <T v="cuerpoFuerte">{x.nombre}</T>
            <T v="hora" suave>
              {telefonoOculto(x.telefono)}
            </T>
          </View>
          <Pressable onPress={() => quitar(i)} accessibilityRole="button" accessibilityLabel={`Quitar a ${x.nombre}`} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
            <Icono nombre="cerrar" color={c.textoSuave} tam={18} />
          </Pressable>
        </Tarjeta>
      ))}

      <View style={{ gap: 10 }}>
        <Rotulo>{contactos.length ? 'AGREGAR A OTRA PERSONA' : 'TU CONTACTO DE CONFIANZA'}</Rotulo>
        <TextInput style={campo} value={nuevoNombre} onChangeText={setNuevoNombre} placeholder="Mamá" placeholderTextColor={c.textoSuave} autoCapitalize="words" accessibilityLabel="Nombre del contacto" />
        <TextInput style={campo} value={nuevoTel} onChangeText={setNuevoTel} placeholder="Celular (9 dígitos)" placeholderTextColor={c.textoSuave} keyboardType="phone-pad" accessibilityLabel="Celular del contacto" />
        {!!error && (
          <T v="apoyo" color={c.alerta}>
            {error}
          </T>
        )}
        <Boton texto="Agregar" icono="mas" variante="secundario" onPress={agregar} />
      </View>

      <View style={{ gap: 8 }}>
        <Rotulo>LO QUE LE LLEGARÁ HOY</Rotulo>
        <View style={{ alignSelf: 'flex-start', maxWidth: 320, padding: 14, backgroundColor: c.superficie2, borderTopLeftRadius: 18, borderTopRightRadius: 14, borderBottomRightRadius: 14, borderBottomLeftRadius: 4 }}>
          <T v="cuerpo15">{textoInvitacion(miNombre.trim())}</T>
        </View>
      </View>

      <View style={{ flex: 1 }} />
      {contactos[0] && (
        <Boton texto={`Invitar a ${contactos[0].nombre} por WhatsApp`} variante="secundario" principal={false} icono="compartir" onPress={() => invitarPorWhatsApp(contactos[0]!, miNombre.trim())} />
      )}
      <Boton
        texto={contactos.length === 0 ? 'Agrega a alguien para seguir' : !miNombre.trim() ? 'Escribe tu nombre para seguir' : paso ? 'Seguir' : 'Guardar'}
        icono="flecha"
        onPress={seguir}
        deshabilitado={contactos.length === 0 || !miNombre.trim()}
      />
    </Pantalla>
  );
}
