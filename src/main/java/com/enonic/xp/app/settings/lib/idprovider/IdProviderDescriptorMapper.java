package com.enonic.xp.app.settings.lib.idprovider;

import java.util.Objects;

import com.enonic.xp.idprovider.IdProviderDescriptor;
import com.enonic.xp.script.serializer.MapGenerator;
import com.enonic.xp.script.serializer.MapSerializable;

public final class IdProviderDescriptorMapper
    implements MapSerializable
{
    private final IdProviderDescriptor idProviderDescriptor;

    public IdProviderDescriptorMapper( final IdProviderDescriptor idProviderDescriptor )
    {
        this.idProviderDescriptor = idProviderDescriptor;
    }

    @Override
    public void serialize( final MapGenerator gen )
    {
        // The descriptor's builder has no default, so a yaml without `mode:` yields null here, and the
        // bridge then omits the key — an empty map, which is still not the same as no descriptor.
        // app-applications calls getMode().toString() unguarded and NPEs on exactly this input.
        gen.value( "mode", Objects.toString( idProviderDescriptor.getMode(), null ) );

        // The config form is left out: no section renders it, and it would drag in a FormMapper.
    }
}
